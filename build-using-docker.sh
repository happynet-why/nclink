#!/bin/bash
set -e

PACKAGE_NAME="luci-app-nclink"
PACKAGE_DIR="$(pwd)/package/$PACKAGE_NAME"
OUTPUT_DIR="$(pwd)/packages"
OPENWRT_VERSION="23.05.3"

TARGETS=(
  "ramips/mt76x8"
  "ath79/generic"
  "ipq40xx/generic"
  "bcm27xx/bcm2710"
  "x86/64"
)

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker."
    exit 1
fi

mkdir -p "$OUTPUT_DIR"
mkdir -p sdk-workdir

for T in "${TARGETS[@]}"; do
  TARGET=$(echo "$T" | cut -d'/' -f1)
  SUBTARGET=$(echo "$T" | cut -d'/' -f2)
  SDK_NAME="openwrt-sdk-${OPENWRT_VERSION}-${TARGET}-${SUBTARGET}_gcc-12.3.0_musl.Linux-x86_64"
  SDK_TARBALL="${SDK_NAME}.tar.xz"
  SDK_URL="https://downloads.openwrt.org/releases/${OPENWRT_VERSION}/targets/${TARGET}/${SUBTARGET}/${SDK_TARBALL}"
  SDK_DIR="sdk-workdir/${SDK_NAME}"

  echo "🔄 Processing $TARGET/$SUBTARGET..."

  # Download and extract SDK if not already
  if [ ! -d "$SDK_DIR" ]; then
    echo "📥 Downloading SDK: $SDK_URL"
    mkdir -p sdk-workdir
    curl -L -o "sdk-workdir/$SDK_TARBALL" "$SDK_URL"
    echo "📦 Extracting SDK..."
    tar -C sdk-workdir -xf "sdk-workdir/$SDK_TARBALL"
  fi

  # Copy your package into the SDK
  cp -r "$PACKAGE_DIR" "$SDK_DIR/package/"

  # Build inside Docker
  docker run --rm -v "$SDK_DIR":/build -w /build openwrt/rootfs /bin/bash -c "
    set -e
    ./scripts/feeds update -a > /dev/null
    ./scripts/feeds install -a > /dev/null

    echo 'CONFIG_PACKAGE_$PACKAGE_NAME=y' >> .config
    make defconfig
    make package/$PACKAGE_NAME/compile -j\$(nproc) V=s
  "

  # Copy resulting IPKs to output
  find "$SDK_DIR/bin/packages/" -name "${PACKAGE_NAME}_*.ipk" -exec cp {} "$OUTPUT_DIR" \;
done

# Build Packages.gz
echo "📦 Generating Packages.gz..."
cd "$OUTPUT_DIR"
if command -v opkg-scanpackages &> /dev/null; then
    opkg-scanpackages . > Packages
else
    docker run --rm -v "$(pwd)":/data openwrt/rootfs /bin/sh -c "opkg-scanpackages /data > /data/Packages"
fi
gzip -f Packages

echo "✅ All builds complete. IPKs and repo index are in $OUTPUT_DIR"
