# NCLink

A community-focused networking solution for OpenWrt.

## Installation

### Quick Installation via SSH

The easiest way to install NCLink is using our automated installation script. This script will automatically detect your device's architecture and install the correct package.

1.  open the Terminal app on your device and SSH into your OpenWrt router buy typing the following command:
   ```bash
   ssh root@192.168.1.1 
   ```

2. Run the following command to download and execute the installation script:
   ```bash
   wget -O- https://raw.githubusercontent.com/happynet-why/nclink/main/install.sh | sh
   ```

   If wget is not available, you can use curl:
   ```bash
   curl -s https://raw.githubusercontent.com/happynet-why/nclink/main/install.sh | sh
   ```

The script will:
- Detect your device's architecture
- Download the appropriate package
- Install NCLink automatically
- Clean up temporary files

After installation, you can access NCLink through the LuCI web interface under the Services menu.

### How to Install via LuCI Web Interface

1. Add Custom Feed:
   - Go to System → Software
   - Click on "Configuration"
   - Add the following feed under "Custom feeds":
     ```
     src/gz customrepo https://raw.githubusercontent.com/happynet-why/nclink/main/package
     ```
   - Click "Save & Apply"

2. Install the Package:
   - Click "Update Lists"
   - Search for "luci-app-nclink"
   - Click "Install"

### Manual Installation

You can also install the package manually via SSH:

1. Add the custom repository:
   ```bash
   echo "src/gz customrepo https://raw.githubusercontent.com/happynet-why/nclink/main/package" >> /etc/opkg/customfeeds.conf
   ```

2. Update and install:
   ```bash
   opkg update
   opkg install luci-app-nclink
   ```



## Development Roadmap

### Week 1: Research & Initial Development

#### Learn OpenWrt Development Basics
- Study OpenWrt package architecture
  - Configuration   
  - Communication
  - Service management
  - init scripts
- Explore OpenWrt's build system and package development
- Learn about LuCI framework
  - Lua implementation
  - CBI framework
  - View rendering
  - JSON-RPC

#### Setup Development Environment
- Install required dependencies
  - SDK
  - Toolchain
  - quilt
  - git
  - make
- Set up OpenWrt test environment
  - Configure test device or emulator (QEMU/VM)
  - Setup development workspace
- Study luci-app-hello-world as reference

#### Develop Basic LuCI Page
- Create simple LuCI addon with "Hello, World!"
- Implement LuCI menu integration
- Test .ipk package deployment

### Week 2: Building & UI Development

#### Set Up Package Repository & Build System
- Create OpenWrt Makefile
- Structure package (luci-app-nclink)
- Build and test .ipk installation

#### Develop Initial UI
- Design and implement LuCI interface
- Implement configuration handling
  - CBI model integration
  - Form handling
- Create basic settings and status display

### Week 3: Core Functionalities & Interaction

#### System Service Integration
- Implement UBUS communication
- Develop Lua service for core logic
- Add JavaScript frontend interactions

#### Network Interface Management
- Create interface selection UI
- Implement network interface detection
- Display available interfaces (uci show network)

#### Firewall & Routing
- Design UI for configuration
- Develop routing rule management
- Implement backend scripts

### Week 4: Refinements & Compatibility

#### Core Feature Completion
- Complete VPN integration
  - WireGuard support
  - l2tp support
- Implement full Kill-switch functionality
- Ensure persistence across reboots

#### Multi-Architecture Support
- Cross-compile for multiple architectures (3-5)
- Validate on different devices
- Document architecture-specific considerations

#### Distribution Preparation
- Set up online repository for .ipk
- Create comprehensive documentation
- Write installation guides

### Week 5: Release & Advanced Features

#### Initial Release
- Package nclink v1.0
- Create changelog
- Document release notes
- Conduct basic user testing
- Address critical bugs

#### Enhanced Features
- Implement guest WiFi configuration
- Design neighbor login dashboard
- Plan future enhancements

---
