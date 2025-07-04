#!/bin/bash
set -e

PACKAGE_NAME="luci-app-nclink"
PACKAGE_SRC_DIR="./package/$PACKAGE_NAME"
OUTPUT_DIR="./packages"
OPENWRT_VERSION="23.05.3"

TARGET_TAGS=(
  "ramips-mt76x8-${OPENWRT_VERSION}"
  "ath79-generic-${OPENWRT_VERSION}"
  "ipq40xx-generic-${OPENWRT_VERSION}"
  "bcm27xx-bcm2710-${OPENWRT_VERSION}"
  "x86-64-${OPENWRT_VERSION}"
)

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker to run this script."
    exit 1
fi

if [ ! -d "$PACKAGE_SRC_DIR" ]; then
    echo "❌ Package directory not found at: $PACKAGE_SRC_DIR"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"
echo "✅ Final IPKs will be placed in: $OUTPUT_DIR"

for TAG in "${TARGET_TAGS[@]}"; do
  IMAGE="openwrt/sdk:${TAG}"
  echo "============================================"
  echo "Building with Docker image: ${IMAGE}"
  echo "============================================"

  docker run --rm \
    -v "$PACKAGE_SRC_DIR":/home/build/openwrt/package/$PACKAGE_NAME:ro \
    -v "$OUTPUT_DIR":/home/build/openwrt/bin/packages \
    "$IMAGE" \
    /bin/bash -c "
      cd /home/build/openwrt;
      ./scripts/feeds update -a > /dev/null;
      ./scripts/feeds install -a > /dev/null;

      echo 'CONFIG_PACKAGE_$PACKAGE_NAME=y' >> .config;
      make defconfig;

      make package/$PACKAGE_NAME/compile -j\$(nproc) V=s || exit 1;
      echo '✅ Build complete for $TAG';
    "
done

echo "============================================"
echo "Generating Packages.gz index..."
cd "$OUTPUT_DIR"

if command -v opkg-scanpackages &> /dev/null; then
    opkg-scanpackages . > Packages
else
    echo "Info: 'opkg-scanpackages' not found locally. Using Docker to generate index..."
    docker run --rm -v "$OUTPUT_DIR":/data openwrt/rootfs /bin/sh -c "opkg-scanpackages /data > /data/Packages"
fi
gzip -f Packages

echo "✅ All builds are complete. IPKs and repository index are in $OUTPUT_DIR"
