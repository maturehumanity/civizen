#!/usr/bin/env bash
# Install Node.js latest LTS into /usr/local and remove Ubuntu apt nodejs 18.
set -euo pipefail

NODE_VER="${1:-24.18.1}"
ARCH_RAW="$(uname -m)"
case "$ARCH_RAW" in
  x86_64|amd64) ARCH=linux-x64 ;;
  aarch64|arm64) ARCH=linux-arm64 ;;
  *)
    echo "Unsupported architecture: $ARCH_RAW" >&2
    exit 1
    ;;
esac

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "Downloading Node v${NODE_VER} (${ARCH})..."
curl -fsSL "https://nodejs.org/dist/v${NODE_VER}/node-v${NODE_VER}-${ARCH}.tar.xz" -o "$TMP/node.tar.xz"

echo "Installing to /usr/local (sudo password may be required)..."
sudo tar -xJf "$TMP/node.tar.xz" -C /usr/local --strip-components=1

echo "Removing Ubuntu apt nodejs package..."
sudo apt-get remove -y nodejs
sudo apt-get autoremove -y

hash -r
echo
echo "Verification:"
echo "  /usr/local/bin/node -> $(/usr/local/bin/node -v)"
echo "  which node          -> $(command -v node)"
echo "  node -v             -> $(node -v)"
echo "  npm -v              -> $(npm -v)"
if command -v dpkg >/dev/null && dpkg -l nodejs 2>/dev/null | grep -q '^ii'; then
  echo "WARNING: apt nodejs is still installed:" >&2
  dpkg -l nodejs | tail -1 >&2
  exit 1
fi
echo "Done. Apt Node 18 removed; system Node is LTS ${NODE_VER}."
