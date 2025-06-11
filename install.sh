#!/bin/sh

# Base URL for the packages
BASE_URL="https://raw.githubusercontent.com/happynet-why/nclink/main/packages"

# Function to detect architecture
detect_arch() {
    local arch=$(uname -m)
    case "$arch" in
        "mips")
            echo "mips_24kc"
            ;;
        "mipsel")
            echo "mipsel_24kc"
            ;;
        "aarch64")
            echo "aarch64_cortex-a53"
            ;;
        "armv7l")
            echo "arm_cortex-a7_neon-vfpv4"
            ;;
        "i686"|"i386")
            echo "i386_pentium4"
            ;;
        *)
            echo "Unsupported architecture: $arch"
            exit 1
            ;;
    esac
}

# Function to download and install package
install_package() {
    local arch=$1
    local package_name="luci-app-nclink_1.2-1_${arch}.ipk"
    local package_url="${BASE_URL}/${package_name}"
    local tmp_file="/tmp/${package_name}"

    echo "Detected architecture: $arch"
    echo "Downloading package: $package_name"

    # Try wget first, fall back to curl if wget is not available
    if command -v wget >/dev/null 2>&1; then
        wget -q -O "$tmp_file" "$package_url"
    elif command -v curl >/dev/null 2>&1; then
        curl -s -o "$tmp_file" "$package_url"
    else
        echo "Error: Neither wget nor curl is available, please run 'opkg update && opkg install curl' and try again"
        exit 1
    fi

    if [ ! -f "$tmp_file" ]; then
        echo "Error: Failed to download package"
        exit 1
    fi

    echo "Updating package lists..."
    opkg update

    echo "Installing package..."
    opkg install "$tmp_file"

    # Clean up
    rm -f "$tmp_file"
}

# Main installation process
echo "Starting NCLink installation..."

# Detect architecture
ARCH=$(detect_arch)
if [ $? -ne 0 ]; then
    echo "Error: $ARCH"
    exit 1
fi

# Install the package
install_package "$ARCH"

echo "Installation completed!" 