#!/bin/bash
set -e

# --- Configuration ---
# Your package name
PACKAGE_NAME="luci-app-nclink"

# ABSOLUTE path to the directory containing your package source code
# Using absolute paths with Docker is more reliable.
PACKAGE_SRC_DIR="./"

# ABSOLUTE path to the directory where final IPKs will be stored
OUTPUT_DIR="./packages"

# OpenWrt version you are targeting
OPENWRT_VERSION="23.05.3"

# Docker image tags for your targets. Find these on Docker Hub for 'openwrt/sdk'
# Format: <version>-<target>-<subtarget>
# docker pull openwrt/sdk:ramips-mt76x8-23.05.5
TARGET_TAGS=(
  "ramips-mt76x8-${OPENWRT_VERSION}"
  "ath79-generic-${OPENWRT_VERSION}"
  "ipq40xx-generic-${OPENWRT_VERSION}"
  "bcm27xx-bcm2710-${OPENWRT_VERSION}"
  "x86-64-${OPENWRT_VERSION}"
)

# --- Script Logic ---

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker to run this script."
    exit 1
fi

if [ ! -d "$PACKAGE_SRC_DIR" ]; then
    echo "❌ Package source directory not found at: $PACKAGE_SRC_DIR"
    exit 1
fi

# Create the output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"
echo "✅ Final IPKs will be placed in: $OUTPUT_DIR"

for TAG in "${TARGET_TAGS[@]}"; do
  IMAGE="openwrt/sdk:${TAG}"
  echo "============================================"
  echo "Building with Docker image: ${IMAGE}"
  echo "============================================"

  # The magic happens here!
  # We run the build inside a temporary container.
  #  --rm : Automatically remove the container when it exits.
  #  -v "$PACKAGE_SRC_DIR":/home/build/package/$PACKAGE_NAME:ro : Mount your source code read-only.
  #  -v "$OUTPUT_DIR":/home/build/bin : Mount your output dir to the SDK's output.
  #  /bin/sh -c "..." : The commands to run inside the container.
  docker run --rm \
    -v "$PACKAGE_SRC_DIR":/home/build/package/$PACKAGE_NAME:ro \
    -v "$OUTPUT_DIR":/home/build/bin \
    "$IMAGE" \
    /bin/sh -c " \
      echo '--> Updating feeds...'; \
      ./scripts/feeds update -a > /dev/null; \
      echo '--> Installing feed packages...'; \
      ./scripts/feeds install -a > /dev/null; \
      echo '--> Compiling package: $PACKAGE_NAME...'; \
      make package/$PACKAGE_NAME/compile -j\$(nproc) || exit 1; \
      echo '✅ Build complete for $TAG'; \
    "
  
  # The IPKs are automatically placed in your $OUTPUT_DIR because of the volume mount.
  # No need for 'find' or 'cp' commands.
done

# Generate Packages.gz in the output folder
echo "============================================"
echo "Generating Packages.gz index..."
cd "$OUTPUT_DIR"

# 'opkg-scanpackages' is available in many build environments or can be installed.
# It's the most reliable way to create the index.
# We'll check for it and use it if available.
if command -v opkg-scanpackages &> /dev/null; then
    opkg-scanpackages . > Packages
else
    # Fallback for systems without opkg-utils, by running it inside a container.
    echo "Info: 'opkg-scanpackages' not found locally. Using Docker to generate index..."
    docker run --rm -v "$OUTPUT_DIR":/data openwrt/sdk /bin/sh -c "opkg-scanpackages /data > /data/Packages"
fi
gzip -f Packages

echo "✅ All builds are complete. IPKs and repository index are in $OUTPUT_DIR"