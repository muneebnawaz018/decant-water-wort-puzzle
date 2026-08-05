#!/usr/bin/env python3
"""
Cut long source recordings down to the game's one-shots.

    # drop long files in assets/audio/source/ named after the sound they feed
    python3 script/prepare-sounds.py

    # audition where it wants to cut, without writing anything
    python3 script/prepare-sounds.py --dry-run

    # override the cut point when the automatic one picks the wrong moment
    python3 script/prepare-sounds.py --only pour --start 12.4

In:   assets/audio/source/{tap,pour,complete,level,illegal}.wav   (any length)
Out:  assets/audio/{tap,pour,complete,level,illegal}.wav          (game-ready)

Sound libraries ship continuous takes — thirty seconds of a jug emptying, a
minute of glasses being struck. That is the right way to record and the wrong
thing to ship: a game needs the two hundred milliseconds where something
actually happens, starting exactly on the transient.

This finds that moment and cuts it. It also does the four things a sourced file
always needs and never has: one channel, 44.1kHz, a level that matches the rest
of the set, and edges faded to true zero so the buffer cannot click.

Source files are gitignored. They are large, they are not shipped, and the
licence on them is recorded in assets/audio/CREDITS.md.
"""

from __future__ import annotations

import argparse
import math
import struct
import sys
import wave
from pathlib import Path

import numpy as np
from scipy import signal

SAMPLE_RATE = 44_100
ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "audio" / "source"
OUT = ROOT / "assets" / "audio"


class Target:
    """
    What one sound should end up as.

    `length` is a ceiling, not a target — a cut is allowed to end early if the
    recording goes quiet, which is what stops a 340ms pour dragging a tail of
    room tone behind it.

    `peak` is the level relative to full scale, and the numbers are deliberately
    unequal. The tap sits ~12dB under the completion chime: if every sound is
    as loud as every other one, the player cannot tell from sound alone whether
    something important just happened.
    """

    def __init__(self, name: str, length: float, peak: float, fade_out: float, note: str):
        self.name = name
        self.length = length
        self.peak = peak
        self.fade_out = fade_out
        self.note = note


TARGETS = [
    Target("tap", 0.090, 0.16, 0.030, "vial tap — fires on every touch, keep it under notice"),
    # Shorter than the 350ms pour animation on purpose. A sound still going
    # after the liquid has visibly settled reads as detached from it.
    Target("pour", 0.340, 0.34, 0.090, "liquid landing, pitched at runtime by fill"),
    Target("complete", 1.400, 0.62, 0.400, "one vial finished — let it ring"),
    Target("level", 2.200, 0.72, 0.600, "level solved"),
    Target("illegal", 0.260, 0.40, 0.080, "rejected tap — soft, there is no fail state here"),
]


def read_any(path: Path) -> np.ndarray:
    """
    Load a WAV at any bit depth, channel count or sample rate as mono float
    at 44.1kHz.

    Libraries ship 24-bit 96kHz stereo as a matter of course. `wave` hands back
    raw frames, so the unpacking is done here rather than trusting a helper to
    guess the format.
    """
    with wave.open(str(path), "rb") as f:
        channels = f.getnchannels()
        width = f.getsampwidth()
        rate = f.getframerate()
        raw = f.readframes(f.getnframes())

    if width == 2:
        data = np.frombuffer(raw, dtype="<i2").astype(np.float64) / 32768.0
    elif width == 3:
        # 24-bit has no numpy dtype: widen each 3-byte sample to 4 with the
        # sign carried into the new top byte.
        packed = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3)
        widened = np.zeros((len(packed), 4), dtype=np.uint8)
        widened[:, 1:] = packed
        data = widened.view("<i4").flatten().astype(np.float64) / (2**31)
    elif width == 4:
        data = np.frombuffer(raw, dtype="<i4").astype(np.float64) / (2**31)
    elif width == 1:
        data = (np.frombuffer(raw, dtype=np.uint8).astype(np.float64) - 128) / 128.0
    else:
        raise ValueError(f"{path.name}: unsupported sample width {width * 8}-bit")

    if channels > 1:
        data = data.reshape(-1, channels).mean(axis=1)

    if rate != SAMPLE_RATE:
        common = math.gcd(int(rate), SAMPLE_RATE)
        data = signal.resample_poly(data, SAMPLE_RATE // common, int(rate) // common)

    return np.nan_to_num(data)


def envelope(x: np.ndarray, window: int = 512) -> np.ndarray:
    """Smoothed absolute value — loudness over time, not sample values."""
    return np.convolve(np.abs(x), np.ones(window) / window, mode="same")


def find_cut(x: np.ndarray, length: float) -> int:
    """
    Where in a long recording the interesting part starts.

    Two steps. First find the window of the target length carrying the most
    energy — that locates the event roughly. Then find the onset *inside* that
    window and cut there.

    Searching forward inside the window rather than backwards from it is the
    part that took a second attempt. When the target length is longer than the
    event — a 1.4s chime slot holding a 0.8s ring — every window that contains
    the whole event scores identically, and `argmax` returns the earliest of
    them. Cutting there leaves half a second of room tone before the sound,
    which on a button press is a delay the player feels as lag.

    Cutting late is the opposite failure and worse: a one-shot missing its
    attack sounds like it had already started before you pressed anything. So
    the cut lands a few milliseconds before the onset, never after.
    """
    span = int(length * SAMPLE_RATE)
    if len(x) <= span:
        return 0

    env = envelope(x)

    # Energy per candidate window, via a cumulative sum: the alternative is a
    # loop over every sample position, which on a three-minute 44.1k file is
    # eight million windows.
    power = np.concatenate([[0.0], np.cumsum(env**2)])
    totals = power[span:] - power[:-span]
    window_at = int(np.argmax(totals))

    # The onset is the first point in that window that is genuinely loud. A
    # twentieth of the file's peak clears room tone and preamp hiss without
    # tripping on the quiet leading edge of a soft attack.
    floor = env.max() * 0.05
    inside = env[window_at : window_at + span]
    loud = np.where(inside > floor)[0]
    onset = window_at + int(loud[0]) if len(loud) else window_at

    # A few milliseconds of lead-in, so the attack is never clipped.
    return max(0, onset - int(0.005 * SAMPLE_RATE))


def trim_tail(x: np.ndarray, floor_db: float = -45.0) -> np.ndarray:
    """
    Drop trailing near-silence.

    Library takes have room tone after the event. Keeping it costs bundle size
    and, worse, holds a voice allocated while nothing audible is happening.
    """
    env = envelope(x)
    floor = env.max() * (10 ** (floor_db / 20))
    loud = np.where(env > floor)[0]
    return x[: int(loud[-1]) + 1] if len(loud) else x


def shape(x: np.ndarray, target: Target) -> np.ndarray:
    """Fade both edges to true zero, then set the level."""
    fade_in = min(int(0.004 * SAMPLE_RATE), len(x) // 4)
    fade_out = min(int(target.fade_out * SAMPLE_RATE), len(x) - fade_in)

    if fade_in > 0:
        x[:fade_in] *= np.linspace(0.0, 1.0, fade_in)
    if fade_out > 0:
        # Squared, so it thins out rather than closing like a door.
        x[-fade_out:] *= np.linspace(1.0, 0.0, fade_out) ** 2

    largest = float(np.max(np.abs(x)))
    if largest > 0:
        x = x / largest * target.peak

    # Remove any DC the source carried. A DC-offset sample wastes headroom and
    # thumps when it starts.
    return x - x.mean() * np.hanning(len(x))


def write(path: Path, x: np.ndarray) -> None:
    pcm = (np.clip(x, -1.0, 1.0) * 32767.0).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        f.writeframes(struct.pack(f"<{len(pcm)}h", *pcm))


def process(target: Target, start: float | None, dry_run: bool) -> bool:
    source = SOURCE / f"{target.name}.wav"
    if not source.exists():
        print(f"  {target.name:9} — no {source.relative_to(ROOT)}, skipped")
        return False

    audio = read_any(source)
    original = len(audio) / SAMPLE_RATE

    cut = int(start * SAMPLE_RATE) if start is not None else find_cut(audio, target.length)
    piece = audio[cut : cut + int(target.length * SAMPLE_RATE)].copy()

    if len(piece) == 0:
        print(f"  {target.name:9} — cut at {cut / SAMPLE_RATE:.2f}s is past the end")
        return False

    piece = trim_tail(piece)
    piece = shape(piece, target)

    peak_db = 20 * math.log10(max(float(np.max(np.abs(piece))), 1e-9))
    print(
        f"  {target.name:9} {original:6.1f}s → {len(piece) / SAMPLE_RATE * 1000:5.0f}ms"
        f"  cut at {cut / SAMPLE_RATE:6.2f}s  peak {peak_db:5.1f} dBFS"
    )

    if not dry_run:
        write(OUT / f"{target.name}.wav", piece)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", help="process a single sound by name")
    parser.add_argument(
        "--start",
        type=float,
        help="cut point in seconds, overriding the automatic one (use with --only)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="report the cuts without writing anything",
    )
    args = parser.parse_args()

    if args.start is not None and not args.only:
        parser.error("--start applies to one sound; pass --only as well")

    if not SOURCE.exists():
        print(f"No source directory. Create {SOURCE.relative_to(ROOT)} and put your")
        print("downloads in it, named tap.wav, pour.wav, complete.wav, level.wav,")
        print("illegal.wav. Any length, any sample rate, mono or stereo.")
        return 1

    targets = [t for t in TARGETS if not args.only or t.name == args.only]
    if not targets:
        print(f"Unknown sound '{args.only}'. Known: {', '.join(t.name for t in TARGETS)}")
        return 1

    print(f"{'Auditioning' if args.dry_run else 'Writing'} from {SOURCE.relative_to(ROOT)}")
    done = sum(process(t, args.start, args.dry_run) for t in targets)

    if done == 0:
        print("\nNothing to do.")
        return 1

    if args.dry_run:
        print("\nDry run — nothing written. Drop --dry-run to keep these cuts.")
    else:
        print(f"\n{done} written. Play them before trusting the numbers:")
        print("  afplay assets/audio/pour.wav")

    return 0


if __name__ == "__main__":
    sys.exit(main())
