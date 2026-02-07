#!/usr/bin/env bash
set -e

REPO="Kushalrock/envsimple"

OS=$(uname -s)
ARCH=$(uname -m)

if [[ "$OS" == "Darwin" ]]; then PLATFORM="darwin-arm64"; fi
if [[ "$OS" == "Linux" ]]; then PLATFORM="linux-x64"; fi

URL="https://github.com/$REPO/releases/latest/download/envsimple-$PLATFORM"

echo "Downloading EnvSimple CLI..."
curl -L "$URL" -o envsimple

chmod +x envsimple
sudo mv envsimple /usr/local/bin/envsimple

echo "Installed EnvSimple CLI"
envsimple --version
