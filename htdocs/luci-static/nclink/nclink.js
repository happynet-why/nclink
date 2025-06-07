// Get all dropdown menus
const availableDropdowns = {
    starlink: 'starlink-interface',
    iran: 'iran-interface',
    vpn: 'vpn-interface',
    guest: 'guest-wifi-interface'
};

var availableInterfaces = [];

function loadNetworkInterfaces() {
    L.uci.load("network").then(function() {
        // Get all sections of type 'interface'
        const interfaces = L.uci.sections("network", "interface");
        availableInterfaces = [];
        // Populate dropdowns with interface information
        interfaces.forEach(function(interface) {
            if (interface['.name'] != 'loopback') {
                const name = interface['.name'];
                const proto = interface['proto'] || 'unknown';
                const ipaddr = interface['ipaddr'] || 'N/A';
                availableInterfaces.push({
                    name: name,
                    proto: proto,
                    ipaddr: ipaddr
                });
            }        
        });

    }).catch(function(error) {
        console.error("Error loading network config:", error);
    });
}


function callUbus(object, method, params = {}) {
    return L.Request.post(L.url('admin/nclink/ubus_proxy'), {
        object: object,
        method: method,
        params: params
    }).then(function(response) {
        console.log("UBUS Response:", response);
        if (!response.ok) {
            throw new Error(response.statusText || 'UBUS call failed');
        }
        return response;
    }).catch(function(error) {
        console.error("UBUS call failed:", error);
        throw error;
    });
}

async function uciCall( method , params ) {
    var result;
    try {
        result = await callUbus('uci', method, params);
        return result;
    } catch (error) {
        console.error('Failed to call uci:', error);
        return false;
    }
}

function getNetworkInterfaces() {
    return callUbus('network.interface', 'dump')
        .then(response => {
            if (response.status == 200) {
                console.log("Network interfaces:", response.json());
                return response;
            } else {
                console.error("Failed to get network interfaces:", response.statusText);
                return [];
            }
        })
        .catch(error => {
            console.error("Failed to get network interfaces:", error);
            return [];
        });
}

function loadWanConfig() {
    getNetworkInterfaces().then(response => {
        const interfaces = response.json().interface;
        console.log("interface:  ", interfaces)
         var wanInterface = ""

        interfaces.forEach(networkInterface => {
           if (networkInterface.interface == "wan")
            {
                wanInterface = networkInterface
            } 
        });

        if (!wanInterface) {

            interfaces.forEach(networkInterface => {
                if (networkInterface.interface == "wwan")
                 {
                     wanInterface = networkInterface
                 } 
             });

        }

        if (!wanInterface) {

            console.error('WAN interface not found');
            return;
        }

        const proto = wanInterface.proto;
       
        const ipaddr = wanInterface?.["ipv4-address"][0]?.["address"]
        const netmask = "/" + wanInterface?.["ipv4-address"][0]?.["mask"]
        const gateway = wanInterface?.["route"][0]?.["nexthop"]
        const dns = wanInterface?.["dns-server"][0]
        console.log("ipaddr: ", ipaddr)
        console.log("netmask: ", netmask)
        console.log("gateway: ", gateway)
        console.log("dns: ", dns)

        document.getElementById('dhcp-toggle').checked = (proto === 'dhcp');
        document.getElementById('static-ip').value = ipaddr;
        document.getElementById('subnet-mask').value = netmask;
        document.getElementById('gateway').value = gateway;
        document.getElementById('dns').value = dns;

        const isDhcpEnabled = (proto === 'dhcp');
        document.getElementById('static-ip').disabled = isDhcpEnabled;
        document.getElementById('subnet-mask').disabled = isDhcpEnabled;
        document.getElementById('gateway').disabled = isDhcpEnabled;
        document.getElementById('dns').disabled = isDhcpEnabled;
    }).catch(error => {
        console.error('Failed to retrieve network interfaces:', error);
    });
}

function setWanConfig() {
    const isDhcpEnabled = document.getElementById('dhcp-toggle').checked;
    const proto = isDhcpEnabled ? 'dhcp' : 'static';

    const params = {
        config: 'network',
        section: 'wan',
        values:{
            proto: proto
        }
    };

    if (!isDhcpEnabled) {
        params.values.ipaddr = document.getElementById('static-ip').value;
        params.values.netmask = document.getElementById('subnet-mask').value;
        params.values.gateway = document.getElementById('gateway').value;
        params.values.dns = document.getElementById('dns').value;
    }
    else {
        callUbus('uci', 'delete', {config: 'network', section: 'wan', options: ['ipaddr', 'netmask', 'gateway', 'dns']}).then(() => {
            console.log('WAN interface configuration updated successfully');
        }).catch(error => {
            console.error('Failed to update WAN interface configuration:', error);
        });
    }

    callUbus('uci', 'set', params).then(() => {
        callUbus('uci', 'commit', {config: 'network'}).then(() => {
            console.log('WAN interface configuration updated successfully');
        }).catch(error => {
            console.error('Failed to commit WAN interface configuration:', error);
        });
    }).catch(error => {
        console.error('Failed to update WAN interface configuration:', error);
    });
}

const wirelessEncryption = {
    "psk2": "WPA2-PSK",
    "psk-mixed": "WPA2-PSK/WPA-PSK Mixed Mode",
    "sae-mixed": "WPA2-PSK/WPA3-SAE Mixed Mode",
    "sae": "WPA3-SAE"
};
function loadWirelessConfig() {
    callUbus("uci", "get", {config:"wireless" , section: "default_radio0"}).then(response => {
        const wirelessInterface = JSON.parse(response.responseText);
        console.log(wirelessInterface)

        if (!wirelessInterface) {
            console.error('Wireless interface not found');
            return;
        }

        const ssid = wirelessInterface.values.ssid;
        const encryption = wirelessInterface.values.encryption;
        const password = wirelessInterface.values.key;
        const disabled = wirelessInterface.values.disabled || 0 ;

        document.getElementById('wireless-toggle').checked = (disabled == 0);
        document.getElementById('ssid').value = ssid;
        document.getElementById('encryption').value = encryption;
        document.getElementById('password').value = password;

        const isWirelessEnabled = (disabled == 0);
        document.getElementById('ssid').disabled = !isWirelessEnabled;
        document.getElementById('encryption').disabled = !isWirelessEnabled;
        document.getElementById('password').disabled = !isWirelessEnabled;
    }).catch(error => {
        console.error('Failed to retrieve wireless interface:', error);
    });
}

function setWirelessConfig() {
    const isWirelessEnabled = document.getElementById('wireless-toggle').checked;
    const ssid = document.getElementById('ssid').value;
    const encryption = document.getElementById('encryption').value;
    const password = document.getElementById('password').value;
    const separateBands = document.getElementById('separate-bands').checked;
    
    const params = {
        config: 'wireless',
        section: 'default_radio0',
        values: {
            ssid: ssid,
            encryption: encryption,
            key: password,
            disabled: isWirelessEnabled ? 0 : 1
        }
    };

    callUbus('uci', 'set', params).then(() => {
        callUbus('uci', 'commit', {config: 'wireless'}).then(() => {
            console.log('Wireless interface configuration updated successfully');
        }).catch(error => {
            console.error('Failed to commit wireless interface configuration:', error);
        });
    }).catch(error => {
        console.error('Failed to update wireless interface configuration:', error);
    });
}


const vpnWireguard = document.getElementById('vpn-wireguard');
const vpnL2tp = document.getElementById('vpn-l2tp');
const wireguardConfig = document.getElementById('wireguard-config');
const l2tpConfig = document.getElementById('l2tp-config');

const wgInputs = wireguardConfig.querySelectorAll('input');
const l2tpInputs = l2tpConfig.querySelectorAll('input');

function toggleVpnConfig() {
    if (vpnWireguard.checked) {
        wireguardConfig.style.display = 'block';    
        l2tpConfig.style.display = 'none';
        wgInputs.forEach(input => input.disabled = false);
        l2tpInputs.forEach(input => input.disabled = true);
    } else if (vpnL2tp.checked) {
        wireguardConfig.style.display = 'none';
        l2tpConfig.style.display = 'block';
        wgInputs.forEach(input => input.disabled = true);
        l2tpInputs.forEach(input => input.disabled = false);
    }
}

vpnWireguard.addEventListener('change', toggleVpnConfig);
vpnL2tp.addEventListener('change', toggleVpnConfig);

// Initial toggle to set the correct state on page load
toggleVpnConfig();

// Function to load VPN configuration
function loadVpnConfig() {
    callUbus("uci", "get", {config: "network", section: "wg0"}).then(response => {
        const vpnConfig = JSON.parse(response.responseText);

        if (!vpnConfig) {
            console.error('VPN configuration not found');
            return;
        }

        console.log("vpnConfig: ", vpnConfig);
       


        const vpnType = vpnConfig?.values?.proto || 'wireguard';
        var wireguardConfig = {};
        if (vpnConfig?.values?.proto == 'wireguard') {
            wireguardConfig = Object.assign({}, vpnConfig?.values );
            callUbus("uci", "get", {config: "network", section: "peer1"}).then(response => {
                const peerConfig = JSON.parse(response.responseText);
                if (!peerConfig) {
                    console.error('Peer configuration not found');
                    return;
                }
                wireguardConfig = Object.assign(wireguardConfig, peerConfig.values );
                document.getElementById('vpn-wireguard').checked = (vpnType === 'wireguard');
                document.getElementById('vpn-l2tp').checked = (vpnType === 'l2tp');

                // WireGuard settings
                document.getElementById('wg-private-key').value = wireguardConfig.private_key || '';
                document.getElementById('wg-public-key').value = wireguardConfig.public_key || '';
                document.getElementById('wg-endpoint-host').value = wireguardConfig.endpoint_host || '';
                document.getElementById('wg-endpoint-port').value = wireguardConfig.endpoint_port || '';
                document.getElementById('wg-address').value = wireguardConfig.addresses || '';
                document.getElementById('wg-dns').value = wireguardConfig.dns || '';
                document.getElementById('wg-preshared-key').value = wireguardConfig.preshared_key || '';
            })
        }

        const l2tpConfig = vpnConfig?.values || {} ;
        

        // L2TP settings
        document.getElementById('l2tp-host').value = l2tpConfig.host || '';
        document.getElementById('l2tp-port').value = l2tpConfig.port || '';
        document.getElementById('l2tp-username').value = l2tpConfig.username || '';
        document.getElementById('l2tp-password').value = l2tpConfig.password || '';
        toggleVpnConfig();

    }).catch(error => {
        console.error('Failed to retrieve VPN configuration:', error);
    });
}

// Function to set VPN configuration
async function setVpnConfig() {
    const vpnType = document.getElementById('vpn-wireguard').checked ? 'wireguard' : 'l2tp';

    if (vpnType == 'wireguard') {
        await unsetWgConfig();
        await setWireguardConfig({
            private_key: document.getElementById('wg-private-key').value,
            addresses: document.getElementById('wg-address').value,
            dns: document.getElementById('wg-dns').value,
            listen_port: "51820",
            mtu: "1420",
            public_key: document.getElementById('wg-public-key').value,
            preshared_key: document.getElementById('wg-preshared-key').value,
            endpoint_host: document.getElementById('wg-endpoint-host').value,
            endpoint_port: document.getElementById('wg-endpoint-port').value,
            persistent_keepalive: "25"
        });
        callUbus( 'network.interface.wg0', 'down' ).then(() => {
            callUbus( 'network.interface.wg0', 'up' ).then(() => {
                console.log('WireGuard interface restarted successfully');
            }).catch(error => {
                console.error('Failed to restart WireGuard interface:', error);
            });
        });
    } else {
        // Handle L2TP configuration
        await unsetL2tpConfig();
        await setL2tpConfig({
            server: document.getElementById('l2tp-host').value,
            username: document.getElementById('l2tp-username').value,
            password: document.getElementById('l2tp-password').value
        });
    }
}

async function setWireguardConfig( wgConfig ) {
    console.log("wgConfig", wgConfig);
    var result;
    var params = {
        config: "network",
        type: "interface",
        name: "wg0",
        values: {
            proto: "wireguard",
            private_key: wgConfig.private_key,
            listen_port: wgConfig.listen_port || 50544 ,
            addresses: wgConfig.addresses,
            mtu: wgConfig.mtu || 1420,
            dns: wgConfig.dns || "1.1.1.1"
        }
    };
    result = await uciCall('add', params);
    console.log("Wireguard server setup result", result);

    var peerConfig =  {
        config: "network",
        type: "wireguard_wg0",
        name: "peer1",
        values: {
            public_key: wgConfig.public_key,
            preshared_key: wgConfig.preshared_key,
            allowed_ips: ["0.0.0.0/0", "::/0"],
            route_allowed_ips: "1",
            endpoint_host: wgConfig.endpoint_host,
            endpoint_port: wgConfig.endpoint_port,
            persistent_keepalive: wgConfig.persistent_keepalive || 25
        }
    };
    result = await uciCall('add', peerConfig);
    console.log("WireGuard peer setup result", result);


    var zoneConfig = {
        config: "firewall",
        type: "zone",
        name: "wg_zone",
        values: {
            name: "wg",
            input: "ACCEPT",
            output: "ACCEPT",
            forward: "ACCEPT",
            network: "wg0"
        }
    };
    result = await uciCall('add', zoneConfig);
    console.log("Firewall zone setup result", result);
    

    var forwardingConfig = {
        config: "firewall",
        type: "forwarding",
        name: "wg_forward",
        values: {
            src: "lan",
            dest: "wg"
        }
    };
    result = await uciCall('add', forwardingConfig);
    console.log("Firewall forwarding setup result", result);

    await uciCommit('network');
    await uciCommit('firewall');
}

async function setKillSwitchConfig(enabled) {
    if (!enabled) {
        callUbus('uci', 'delete', {config: 'firewall', section: "vpn_killswitch"}).then(() => {
            console.log('Firewall rule configuration deleted successfully');
            uciCommit('firewall');
        }).catch(error => {
            console.error('Failed to delete Firewall rule configuration:', error);
        });
        return;
    }
    var params = {
        config: "firewall",
        type: "rule",
        name: "vpn_killswitch",
        values: {
            name: "Block non-VPN traffic",
            src: "lan",
            dest: "*",
            proto: "all",
            family: "ipv4",
            target: "REJECT",
            extra: "-o ! wg0" 
        }
    };
    try {
        result = await callUbus('uci', 'add', params)
        uciCommit('firewall');
    } catch (error) {
        console.error('Failed to update Firewall rule configuration:', error);
        return false;
    }
}

async function unsetWgConfig() {
    await uciDelete('network', 'wg0');
    await uciDelete('network', 'peer1');
    await uciDelete('firewall', 'zone', 'wg');
    await uciDelete('firewall', 'forwarding', 'wg_forward');
    await uciDelete('firewall', 'rule', 'vpn_killswitch');

    await uciCommit('firewall');
    await uciCommit('network');
}

async function unsetL2tpConfig() {
    await uciDelete('network', 'l2tp');
    await uciDelete('firewall', 'zone', 'l2tp');
    await uciDelete('firewall', 'forwarding', 'l2tp_forward');
    await uciDelete('firewall', 'rule', 'vpn_killswitch');

    await uciCommit('firewall');
    await uciCommit('network');
}

async function uciCommit(config) {
    await callUbus('uci', 'commit', {config: config}).then(() => {
        console.log(config + ' configuration updated successfully');
    }).catch(error => {
        console.error('Failed to commit ' + config + ' configuration:', error);
    });
}

async function uciDelete(config, section) {
    await callUbus('uci', 'delete', {config: config, section: section}).then(() => {
        console.log(config + ' configuration deleted successfully');
    }).catch(error => {
        console.error('Failed to delete ' + config + ' configuration:', error);
    });
}

// Bind the functions to the HTML elements
const reloadButton = document.getElementById('reload-interfaces');
const saveButton = document.getElementById('save-interfaces');
const reloadWirelessButton = document.getElementById('reload-wireless');
const saveWirelessButton = document.getElementById('save-wireless');
const reloadVpnButton = document.getElementById('reload-vpn');
const saveVpnButton = document.getElementById('save-vpn');

reloadButton.addEventListener('click', loadWanConfig);
saveButton.addEventListener('click', setWanConfig);
reloadWirelessButton.addEventListener('click', loadWirelessConfig);
saveWirelessButton.addEventListener('click', setWirelessConfig);
reloadVpnButton.addEventListener('click', loadVpnConfig);
saveVpnButton.addEventListener('click', setVpnConfig);

function showNotification(message, severity) {
    L.ui.addNotification({
        message: message,
        severity: severity, // "info", "warning", "error", "success"
    });
}


// L2TP Client
//---------------------------------------------------------------------------------//
async function setL2tpConfig(l2tpConfig) {
    console.log("l2tpConfig", l2tpConfig);
    
    // Set up L2TP interface
    const params = {
        config: "network",
        type: "interface",
        name: "l2tp",
        values: {
            proto: "l2tp",
            server: l2tpConfig.server,
            username: l2tpConfig.username,
            password: l2tpConfig.password,
            auto: "1",
            defaultroute: "1"
        }
    };

    try {
        // Add L2TP interface
        await uciCall('add', params);
        console.log("L2TP interface setup result", params);

        // Add L2TP to firewall zone
        const zoneParams = {
            config: "firewall",
            type: "zone",
            name: "l2tp_zone",
            values: {
                name: "l2tp",
                input: "ACCEPT",
                output: "ACCEPT",
                forward: "ACCEPT",
                network: "l2tp",
                masq: "1"
            }
        };
        await uciCall('add', zoneParams);
        console.log("Firewall zone setup result", zoneParams);

        // Add forwarding rule
        const forwardingParams = {
            config: "firewall",
            type: "forwarding",
            name: "l2tp_forward",
            values: {
                src: "lan",
                dest: "l2tp"
            }
        };
        await uciCall('add', forwardingParams);
        console.log("Firewall forwarding setup result", forwardingParams);

        // Commit changes
        await uciCommit('network');
        await uciCommit('firewall');

        // Restart the L2TP interface
        await callUbus('network.interface.l2tp', 'down');
        await callUbus('network.interface.l2tp', 'up');
        console.log('L2TP interface restarted successfully');

        return true;
    } catch (error) {
        console.error('Failed to set up L2TP configuration:', error);
        return false;
    }
}

async function unsetL2tpConfig() {
    try {
        // Remove L2TP interface
        await uciDelete('network', 'l2tp');
        
        // Remove firewall zone
        await uciDelete('firewall', 'l2tp_zone');
        
        // Remove forwarding rule
        await uciDelete('firewall', 'l2tp_forward');

        // Commit changes
        await uciCommit('firewall');
        await uciCommit('network');

        return true;
    } catch (error) {
        console.error('Failed to unset L2TP configuration:', error);
        return false;
    }
}

// Function to load L2TP configuration
async function loadL2tpConfig() {
    try {
        const response = await callUbus("uci", "get", {config: "network", section: "l2tp"});
        const l2tpConfig = JSON.parse(response.responseText);

        if (!l2tpConfig) {
            console.error('L2TP configuration not found');
            return;
        }

        // Update UI elements with L2TP configuration
        document.getElementById('l2tp-host').value = l2tpConfig.values.server || '';
        document.getElementById('l2tp-username').value = l2tpConfig.values.username || '';
        document.getElementById('l2tp-password').value = l2tpConfig.values.password || '';

    } catch (error) {
        console.error('Failed to retrieve L2TP configuration:', error);
    }
}
//---------------------------------------------------------------------------------//

callUbus('luci-rpc', 'getBoardJSON').then(response => {
    console.log("Board info:", response);
}).catch(error => {
    console.error('Failed to retrieve board info:', error);
});
