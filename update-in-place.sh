#!/bin/bash
# Updates this project folder from the demo-studio branch.
# Leaves local folders in place: node_modules, docs, Project, dist.
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
test -f "$root/package.json" || { echo "package.json was not found. Run this inside the project folder."; exit 1; }
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echo "Downloading demo-studio..."
curl -fsSL -o "$tmp/src.zip" "https://codeload.github.com/Mohammedazif/Frag-digitaltwin-viewer/zip/refs/heads/demo-studio"
unzip -q "$tmp/src.zip" -d "$tmp/unpack"
inner="$(find "$tmp/unpack" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
echo "Replacing code in $root"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude node_modules --exclude docs --exclude Project --exclude dist --exclude dist-ssr --exclude .git --exclude venv --exclude .venv "$inner"/ "$root"/
else
  cp -a "$inner"/. "$root"/
fi
echo
echo "Updated this folder from demo-studio."
echo "docs, node_modules, and saved projects were left as they are."
echo "Reload the viewer."
