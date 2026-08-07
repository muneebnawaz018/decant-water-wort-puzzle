#!/usr/bin/env bash
#
# Connect to a paired Android phone over Wi-Fi, then hand off to the caller.
#
# Wireless debugging moves its port on every reboot and on every toggle of the
# switch, so the address that worked yesterday is worthless today and there is
# nothing stable to write down. The phone does advertise the current one over
# mDNS, which is what this reads — so the only thing you have to do is be on
# the same network with the switch on.
#
# Pairing is separate and survives reboots. It is a one-time step per machine,
# and this script cannot do it: the code is generated on the phone and shown
# only on its screen. If no device is found, the instructions are printed.
#
#   script/android-wireless.sh            connect only
#   script/android-wireless.sh run        connect, then build/install/launch
#   script/android-wireless.sh start      connect, then start Metro
#
# An `ip:port` may be given before the mode, or set as DECANT_ADB, for networks
# that filter multicast between clients — mDNS cannot cross an access point
# doing that, and no amount of waiting will find a phone that is right there.
# Either form is remembered, so it is typed once per port change rather than
# once per run:
#
#   script/android-wireless.sh 172.16.16.226:34399 run
#
set -euo pipefail

readonly SERVICE='_adb-tls-connect._tcp'
# Where the last working address is remembered. Tried before discovery, since
# it costs nothing and a phone that has not rebooted is still on that port.
readonly CACHE="${TMPDIR:-/tmp}/decant-adb-endpoint"
# mDNS is a broadcast-and-wait protocol; this is how long to wait for replies.
readonly DISCOVER_SECONDS=4

info() { printf '\033[36m›\033[0m %s\n' "$1"; }
warn() { printf '\033[33m!\033[0m %s\n' "$1" >&2; }
fail() { printf '\033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }

# `adb` is not on most PATHs even with the SDK installed, and the Android
# Studio default location is not where a Homebrew install puts it.
find_adb() {
  if command -v adb >/dev/null 2>&1; then command -v adb; return; fi
  for candidate in \
    "${ANDROID_HOME:-}/platform-tools/adb" \
    "${ANDROID_SDK_ROOT:-}/platform-tools/adb" \
    "$HOME/Library/Android/sdk/platform-tools/adb" \
    "$HOME/Android/Sdk/platform-tools/adb"
  do
    [ -x "$candidate" ] && { echo "$candidate"; return; }
  done
  fail "adb not found. Install Android platform-tools, or set ANDROID_HOME."
}

ADB="$(find_adb)"

# A physical device, ignoring emulators and offline entries. Emulators matter
# here because `expo run:android` picks the first device it sees, and a running
# emulator is exactly what makes it install to the wrong place.
connected_device() {
  "$ADB" devices \
    | awk '$2 == "device" && $1 ~ /^[0-9]+\./ { print $1; exit }'
}

# The phone's own advertisement, which is the only thing that knows the port.
#
# Two sources, because adb's built-in mDNS is unreliable: it depends on which
# discovery backend the platform-tools build shipped with, and it answers with
# an empty list rather than an error when the backend is missing. macOS always
# has `dns-sd`, which talks to the same Bonjour daemon the phone is publishing
# to, so it is the fallback that actually works.
discover_via_adb() {
  ADB_MDNS_OPENSCREEN=1 "$ADB" mdns services 2>/dev/null \
    | awk -v svc="$SERVICE" '$2 ~ svc { print $3; exit }'
}

discover_via_dns_sd() {
  command -v dns-sd >/dev/null 2>&1 || return 1

  local dump host port ip
  # `-Z` dumps zone-file format, which carries the SRV record — the only form
  # that includes the port. `-B` browse gives a name and nothing else.
  dump="$(
    dns-sd -Z "$SERVICE" local. >"$CACHE.raw" 2>/dev/null &
    local pid=$!
    sleep "$DISCOVER_SECONDS"
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    cat "$CACHE.raw"
  )"
  rm -f "$CACHE.raw"

  # SRV line: "<name> SRV <priority> <weight> <port> <target>."
  port="$(printf '%s\n' "$dump" | awk '$2 == "SRV" { print $5; exit }')"
  host="$(printf '%s\n' "$dump" | awk '$2 == "SRV" { print $6; exit }')"
  [ -n "$port" ] && [ -n "$host" ] || return 1

  # The SRV target is a `.local.` name. Resolve it rather than assuming the
  # phone's address has not changed since the last DHCP lease.
  ip="$(
    dns-sd -G v4 "${host%.}" >"$CACHE.raw" 2>/dev/null &
    local pid=$!
    sleep 2
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    awk '/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/ { print $6; exit }' "$CACHE.raw"
  )"
  rm -f "$CACHE.raw"
  [ -n "$ip" ] || return 1

  echo "$ip:$port"
}

try_connect() {
  local endpoint="$1"
  [ -n "$endpoint" ] || return 1
  # adb reports failure on stdout with exit code 0, so the output is what has
  # to be checked rather than the status.
  "$ADB" connect "$endpoint" 2>&1 | grep -qi '^connected\|already connected'
}

"$ADB" start-server >/dev/null 2>&1 || true

# Clear entries that break `expo run:android` before it ever builds.
#
# It asks *every* attached device for its AVD name to work out which are
# emulators, and one that cannot answer fails the whole command rather than
# that device. Two kinds cannot answer:
#
#   - a dead emulator, whose adb entry outlives its console port, so the query
#     comes back "could not connect to TCP port 5554: Connection refused";
#   - the mDNS service-name transport, which is a second, duplicate route to a
#     phone already connected by address.
#
# Neither is anything the caller asked for, and both are safe to drop: a live
# emulator re-registers, and the phone keeps its address transport.
for stale in $("$ADB" devices | awk '$1 ~ /^adb-.*_adb-tls-connect/ { print $1 }'); do
  "$ADB" disconnect "$stale" >/dev/null 2>&1 || true
done
for emu in $("$ADB" devices | awk '$1 ~ /^emulator-/ { print $1 }'); do
  "$ADB" -s "$emu" emu avd name >/dev/null 2>&1 \
    || warn "Ignoring dead emulator entry: $emu (restart it, or run 'adb kill-server')"
done

# An explicit `ip:port` may lead the arguments. Recognised by shape rather than
# by a flag, since there is exactly one thing it could be.
given="${DECANT_ADB:-}"
if [[ "${1:-}" =~ ^[0-9]+(\.[0-9]+){3}:[0-9]+$ ]]; then
  given="$1"
  shift
fi

serial="$(connected_device || true)"

if [ -n "$serial" ]; then
  info "Already connected: $serial"
elif [ -n "$given" ]; then
  # Given explicitly, so discovery is skipped entirely — and so is the cache,
  # which may hold the stale port this argument exists to correct.
  try_connect "$given" || fail "Could not reach $given. Is wireless debugging on?"
  echo "$given" >"$CACHE"
  endpoint="$given"
  info "Connected on the address given"
else
  # 1. The remembered address, free to try.
  if [ -f "$CACHE" ] && try_connect "$(cat "$CACHE")"; then
    endpoint="$(cat "$CACHE")"
    info "Reconnected on the last known address"
  else
    # 2. Ask the network where the phone is.
    info "Looking for a phone advertising wireless debugging…"
    endpoint="$(discover_via_adb || true)"
    [ -n "$endpoint" ] || endpoint="$(discover_via_dns_sd || true)"

    if [ -z "$endpoint" ] || ! try_connect "$endpoint"; then
      cat >&2 <<'HELP'

✗ No phone found.

On the phone:
  Settings › Developer options › Wireless debugging  → ON
  (and stay on the same Wi-Fi as this Mac)

First time on this machine only — pair it. On the phone open
"Pair device with pairing code", then run with ITS ip:port and code:

  adb pair <ip>:<pairing-port> <6-digit-code>

Pairing survives reboots; the connect port does not, which is why this
script looks it up each time instead of remembering one.

If the phone IS on and paired, this network may be filtering multicast
between clients, which mDNS cannot cross. Read the ip:port off the
Wireless debugging screen and pass it once — it is remembered after:

  npm run wifi -- <ip>:<port>
HELP
      exit 1
    fi
    echo "$endpoint" >"$CACHE"
  fi

  # Scoped with `-s`, because an unqualified wait fails outright with "more
  # than one device/emulator" the moment anything else is attached — and a
  # running emulator is the normal case on a machine that builds for Android.
  #
  # `wait-for-device` returns the moment the transport exists, which is before
  # the device will answer a shell command.
  "$ADB" -s "$endpoint" wait-for-device
  serial="$(connected_device || true)"
  [ -n "$serial" ] || fail "Connected, but no device came up."
  info "Connected: $serial"
fi

model="$("$ADB" -s "$serial" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
info "Device: ${model:-unknown}"

export ANDROID_SERIAL="$serial"

case "${1:-}" in
  run)
    # By name, not by serial: `expo run:android --device` matches on the name
    # it lists, and hands back "Could not find device" for a serial.
    [ -n "$model" ] || fail "Could not read the device name to build for."
    exec npx expo run:android --device "$model"
    ;;
  start)
    # `adb reverse` is what lets the phone reach Metro on localhost, which
    # keeps working if the Wi-Fi address changes mid-session.
    "$ADB" -s "$serial" reverse tcp:8081 tcp:8081 >/dev/null
    exec npx expo start --dev-client
    ;;
  '')
    "$ADB" -s "$serial" reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
    info "Ready. 'npm run android:wifi' to build, or 'npm start' for Metro."
    ;;
  *)
    fail "Unknown argument: $1 (expected 'run', 'start', or nothing)"
    ;;
esac
