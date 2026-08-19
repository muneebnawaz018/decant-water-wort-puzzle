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
license on them is recorded in assets/audio/CREDITS.md.
"""

from __future__ import annotations

import argparse
import math
import shutil
import struct
import subprocess
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

    `arrange` names an arrangement below when the cue is *played* rather than
    recorded from a single event — see ARRANGEMENTS. Those skip the cut search,
    because there is nothing to find: the file is built starting at zero.
    """

    def __init__(
        self,
        name: str,
        length: float,
        peak: float,
        fade_out: float,
        note: str,
        arrange: str | None = None,
        damp: float | None = None,
        punch: float | None = None,
    ):
        self.name = name
        self.length = length
        self.peak = peak
        self.fade_out = fade_out
        self.note = note
        self.arrange = arrange
        self.damp = damp
        self.punch = punch


"""
Cues that are *played* rather than recorded.

A chime for finishing a vial does not exist as a thing to record — there is no
object in the world that makes the sound of a puzzle going right. Every app
whose sounds feel designed builds these the same way: take a real instrument,
play the notes, keep the recording. So these are arrangements of a genuine
marimba multisample, not synthesis. The rule in AGENTS.md — recorded sources
only — is intact: every sample here is a wooden bar struck by a player in a
hall, and what this code does is choose which bars and when.

**Marimba because of what the game already is.** The board is glass, and the
first set answered glass with more glass and with digital beeps, which is where
the Nokia-ringtone problem came from: a chiptune arpeggio is the sound of a
1999 feature phone, not of a calm 2026 puzzle. A struck wooden bar is warm,
has a soft attack, and dies away on its own — it sits under a game about
liquid rather than on top of it.

Each entry is `(note file, [(semitones from the sample, start seconds, gain)])`.
Semitone shifts are done by resampling, which moves pitch and length together
exactly as a tape machine does — the same physics as the pour's pitch, and
audible as a slightly shorter ring higher up. Well within the octave these
stay inside.
"""
ARRANGEMENTS: dict[str, tuple[str, list[tuple[float, float, float]]]] = {
    # A vial finished. A rising perfect fifth — the plainest "that is right"
    # interval there is, and short enough to fire on every completed vial
    # without wearing out. Two notes, not one: a single note reads as a
    # neutral tick, and the *rise* is what carries the good news.
    "complete-chime": ("marimba-c5", [(0, 0.000, 1.00), (7, 0.075, 0.85)]),
    # The board solved — the one moment in the game worth celebrating, so this
    # is the only cue that is more than a couple of notes.
    #
    # Its first version was the same triad the vial chime uses, one note after
    # another to the octave, and it landed as "correct" rather than as "you
    # won" — a run of single notes is an *announcement*. Celebration is three
    # things a run does not have, and this has all three:
    #
    # 1. **It arrives somewhere.** The run is now a fast approach (65ms apart,
    #    against the old 105) into a held chord, so the phrase has a
    #    destination instead of just stopping at its top note.
    # 2. **The arrival is thick.** Root, third, fifth and octave struck
    #    together is four bars ringing at once where every other cue in the
    #    game is one — the sudden width is what reads as a flourish.
    # 3. **It keeps ringing.** The chord is struck at full and left alone; the
    #    long fade in TARGETS is what turns it from a hit into an afterglow,
    #    under a win screen that is animating in over exactly that stretch.
    #
    # A grace note under the chord (the low C, quiet) gives it a floor without
    # muddying the top — the same trick as a bass drum under a cymbal.
    "level-fanfare": (
        "marimba-c5",
        [
            # The run up. 170ms a note, and the whole cue lands at about two
            # seconds — the width of the window was found by overshooting it
            # in both directions. At 65ms and 120ms the four notes smeared
            # into one gesture; at 240 they were separate but the phrase
            # dragged, which on a cue that plays at the end of every level is
            # worse than rushing. 170 is a walk you can follow that still
            # gets somewhere.
            (0, 0.000, 0.55),
            (4, 0.170, 0.60),
            (7, 0.340, 0.65),
            (9, 0.510, 0.70),
            # The chord it lands on, struck as one, after a beat's hesitation
            # — the gap before it is longer than the gaps inside the run, so
            # the arrival is heard as an arrival.
            (12, 0.720, 1.00),
            (16, 0.720, 0.80),
            (19, 0.720, 0.65),
            # Two octaves up is a sparkle on the top of the chord and nothing
            # more. Resampling that far thins a marimba out, and at any real
            # level it pushed the whole cue bright enough to turn shrill on a
            # phone speaker — measured, the set's brightness went up by a
            # third. Quiet enough to be felt rather than heard.
            (24, 0.736, 0.22),
            (-12, 0.720, 0.45),
        ],
    ),
    # A refused pour. Low, and a *falling* fifth: down is the direction
    # everything from a sigh to a wrong-answer buzzer moves, and doing it on
    # the same instrument as the rewards makes it read as part of the set
    # rather than as an error from somewhere else. Quiet and dark — there is
    # no fail state in this game, so this is a shrug, not a scold.
    "illegal-thud": ("marimba-c3", [(7, 0.000, 1.00), (0, 0.070, 0.80)]),
}

TARGETS = [
    Target("tap", 0.090, 0.75, 0.030, "vial tap — fires on every touch, keep it under notice"),
    # The chrome's own voice, distinct from the board's on purpose: `tap` is
    # glass because vials are glass, and giving menu buttons the same sound
    # made every screen sound like the game. A 12ms UI click cannot be
    # mistaken for a vial. Quieter than the vial tap — it is the most
    # frequently fired sound in the app.
    Target("click", 0.080, 0.60, 0.020, "chrome button press, under everything"),
    # Sized to the animation's stream, not the whole animation. The pour runs
    # 1850ms end to end but the cue fires at the stream phase (~280ms in) and
    # the last drips fall at ~95% — a 1.35s take covers that window at every
    # runtime pitch (0.92–1.18x plays it at 1.14–1.47s). The numbers live in
    # src/render/pour.ts (POUR_MS, PHASE); retime there, re-cut here.
    Target("pour", 1.350, 0.95, 0.250, "liquid pouring, pitched at runtime by fill"),
    Target(
        "complete",
        1.100,
        0.95,
        0.350,
        "one vial finished — rising fifth, let it ring",
        arrange="complete-chime",
    ),
    Target(
        "level",
        1.750,
        0.98,
        0.600,
        "level solved — slow walk up to a ringing chord",
        arrange="level-fanfare",
        # The only cue with a chord in it, and so the only one whose peak is a
        # sum of simultaneous strikes rather than a single one. Without this
        # it measured 4dB louder than everything else and was reported as
        # quieter in the game, which is exactly what a headroom-eating
        # transient does.
        punch=3.0,
    ),
    Target(
        "illegal",
        0.600,
        0.70,
        0.300,
        "rejected tap — low falling fifth, there is no fail state here",
        arrange="illegal-thud",
        # A struck bar rings bright even in the bass: measured undamped, this
        # cue was *brighter* than the tap, which is backwards for a refusal
        # that doc §7 asks to be a "muted thud". Rolling off above 900Hz is
        # what a player's hand on the bar does — the strike stays, the ring
        # goes soft.
        damp=900,
    ),
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


def shift(x: np.ndarray, semitones: float) -> np.ndarray:
    """
    Move a sample by an interval, by resampling.

    Pitch and length travel together, exactly as they do at runtime — the pour
    is pitched the same way. A struck bar rings shorter the higher it is
    played, so this is also what the real instrument does.
    """
    if semitones == 0:
        return x.copy()
    ratio = 2 ** (semitones / 12)
    n = int(len(x) / ratio)
    # Linear interpolation is enough here: these are one-shots played once,
    # well inside an octave, and the resampling artefacts sit above the
    # marimba's own overtones.
    return np.interp(np.arange(n) * ratio, np.arange(len(x)), x)


def arrange(name: str, seconds: float) -> np.ndarray:
    """
    Build a cue by playing an instrument sample at several pitches and times.

    Notes are summed onto one buffer rather than laid end to end, so an earlier
    note is still ringing when the next arrives — which is what makes two
    strikes sound like one phrase instead of two separate sounds.
    """
    note_file, notes = ARRANGEMENTS[name]
    source = SOURCE / f"{note_file}.wav"
    if not source.exists():
        raise FileNotFoundError(f"{source.relative_to(ROOT)} — arrangement '{name}' needs it")

    sample = read_any(source)
    out = np.zeros(int(seconds * SAMPLE_RATE))

    for semitones, start, gain in notes:
        note = shift(sample, semitones) * gain
        at = int(start * SAMPLE_RATE)
        room = len(out) - at
        if room <= 0:
            continue
        out[at : at + min(room, len(note))] += note[:room]

    return out


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


def damp(x: np.ndarray, cutoff: float) -> np.ndarray:
    """
    Take the ring off a struck sound — a hand on the bar, not an EQ move.

    Zero-phase (`filtfilt`), so the attack does not smear forwards in time; a
    one-shot whose transient has been softened by its own filter sounds late.
    """
    b, a = signal.butter(2, cutoff / (SAMPLE_RATE / 2), btype="low")
    return signal.filtfilt(b, a, x)


def punch(x: np.ndarray, amount: float) -> np.ndarray:
    """
    Round off the peaks so the level can come up — a soft limiter.

    **This is the fix for a chord that measures loud and sounds quiet.** Notes
    struck together sum into one very tall spike, and normalising to a peak
    made of coincident transients spends the whole headroom on a spike two
    milliseconds long: the fanfare peaked 4dB above the vial chime while its
    loudest sustained stretch measured *the same*, which is the part an ear
    actually judges. Nothing was wrong with the gain — the shape was wrong.

    `tanh` because the knee is gradual. A hard clip at the same threshold adds
    odd harmonics that a struck bar does not have, and turns warm wood into
    something buzzy; this leans on the transient the way tape does and leaves
    the body of the note alone.
    """
    peak = float(np.max(np.abs(x)))
    if peak <= 0:
        return x
    return np.tanh(x / peak * amount) / math.tanh(amount)


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


def encode_m4a(wav: Path) -> bool:
    """
    The `.m4a` beside the `.wav` — the file `src/audio/sounds.ts` actually
    ships. The WAV stays as the editing master; AAC is a twentieth of its size
    and both platform engines decode it natively.

    In the script rather than a README step because it *was* a README step,
    and a hand-run encode is how a re-levelled WAV ships with last month's
    m4a sitting silently beside it.
    """
    if not shutil.which("ffmpeg"):
        print("  !! ffmpeg not found — .wav written, .m4a NOT updated (brew install ffmpeg)")
        return False
    result = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
         "-c:a", "aac", "-b:a", "128k", "-ar", str(SAMPLE_RATE), "-ac", "1",
         str(wav.with_suffix(".m4a"))],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"  !! ffmpeg failed on {wav.name}: {result.stderr.strip()}")
        return False
    return True


def process(target: Target, start: float | None, dry_run: bool) -> bool:
    # An arranged cue has no recording to search: it is built to length,
    # already starting on its first note.
    if target.arrange:
        try:
            piece = arrange(target.arrange, target.length)
        except FileNotFoundError as missing:
            print(f"  {target.name:9} — {missing}")
            return False
        original, cut = target.length, 0
    else:
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

    if target.damp:
        piece = damp(piece, target.damp)

    if target.punch:
        piece = punch(piece, target.punch)

    piece = trim_tail(piece)
    piece = shape(piece, target)

    peak_db = 20 * math.log10(max(float(np.max(np.abs(piece))), 1e-9))
    print(
        f"  {target.name:9} {original:6.1f}s → {len(piece) / SAMPLE_RATE * 1000:5.0f}ms"
        f"  cut at {cut / SAMPLE_RATE:6.2f}s  peak {peak_db:5.1f} dBFS"
    )

    if not dry_run:
        out = OUT / f"{target.name}.wav"
        write(out, piece)
        encode_m4a(out)
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
        print(f"\n{done} written (.wav master + .m4a shipped). Play before trusting numbers:")
        print("  afplay assets/audio/pour.m4a")

    return 0


if __name__ == "__main__":
    sys.exit(main())
