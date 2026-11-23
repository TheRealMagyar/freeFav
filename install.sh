#!/bin/sh
# Link this repo into an Equicord source checkout as a userplugin.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
EQUICORD="${EQUICORD:-$HOME/Documents/Equicord}"
DEST="$EQUICORD/src/userplugins/freeFav"

if [ ! -d "$EQUICORD/src" ]; then
    echo "Equicord source not found: $EQUICORD" >&2
    exit 1
fi

mkdir -p "$DEST"
cp "$ROOT/index.tsx" "$ROOT/logic.ts" "$DEST/"
echo "Installed $DEST"
echo "Next: cd \"$EQUICORD\" && pnpm build, then restart Discord and enable FreeFav."
