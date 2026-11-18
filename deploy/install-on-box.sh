#!/usr/bin/env bash
# Copies everything to the box (tar over ssh: the box has no rsync). It ONLY copies files:
# no restart, no nginx change, no sudo. The remaining steps are in deploy/INSTALL.md.
#
# Run on your PC from the repository root (after `npm ci && npm run build` in src/webapp-next):
#   deploy/install-on-box.sh admin@192.168.188.135            # copy
#   deploy/install-on-box.sh admin@192.168.188.135 --dry-run  # only list
set -euo pipefail
BOX="${1:?usage: $0 user@box [--dry-run]}"
DRY="${2:-}"
cd "$(dirname "$0")/.."
[ -f src/webapp-next/build/index.html ] || { echo "Build missing: cd src/webapp-next && npm ci && npm run build"; exit 1; }

# push <local base dir> <remote dir (relative to ~)> <paths inside base...>
push() {
  local base="$1" dest="$2"; shift 2
  echo "-> ~/$dest: $*"
  [ "$DRY" = "--dry-run" ] && return 0
  tar -C "$base" -cf - "$@" | ssh "$BOX" "mkdir -p '$dest' && tar -C '$dest' -xf -"
}

R=RPi-Jukebox-RFID
# 1) new web app next to the old one (src/webapp/build stays untouched = rollback)
[ "$DRY" = "--dry-run" ] || ssh "$BOX" "rm -rf $R/src/webapp-next/build"
push src/webapp-next/build "$R/src/webapp-next/build" .
# 2) kids mode plugin + signal sound + config tool; the alias file lands next to the repo, NOT over the original
push src/jukebox/components "$R/src/jukebox/components" kidsbox
push resources/audio "$R/resources/audio" unknown-card.wav
push deploy/kids-config "$R/deploy/kids-config" .
push src/jukebox/components "phoniebox-update" rpc_command_alias.py
# 3) upload service + nginx files
push deploy/upload-service "phoniebox-upload" phoniebox_upload.py phoniebox-upload.service \
  nginx-upload.conf upload-service.conf.example
push deploy "phoniebox-upload" nginx-webapp-next.conf
echo "Copied. Continue with deploy/INSTALL.md, step 3."
