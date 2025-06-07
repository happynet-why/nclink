// Status update functions
function updateWanStatus() {
    callUbus('network.interface', 'dump').then(response => {
        const interfaces = response.json().interface;
        const wanInterface = interfaces.find(iface => iface.interface === 'wan');
        
        if (wanInterface) {
            const status = wanInterface.up ? 'connected' : 'disconnected';
            const ipaddr = wanInterface['ipv4-address']?.[0]?.['address'] || '-';
            const gateway = wanInterface.route?.[0]?.['nexthop'] || '-';
            const dns = wanInterface['dns-server']?.[0] || '-';
            const uptime = formatUptime(wanInterface.uptime || 0);

            document.getElementById('wan-proto').textContent = wanInterface.proto || '-';
            document.getElementById('wan-status').textContent = status;
            document.getElementById('wan-status').className = `status-value ${status}`;
            document.getElementById('wan-ip').textContent = ipaddr;
            document.getElementById('wan-gateway').textContent = gateway;
            document.getElementById('wan-dns').textContent = dns;
            document.getElementById('wan-uptime').textContent = uptime;
        }
    }).catch(error => {
        console.error('Failed to get WAN status:', error);
    });
}

function updateWifiStatus() {
    callUbus('wireless', 'status').then(response => {
        const wirelessStatus = response.json();
        const radio0 = wirelessStatus.radio0;
        
        if (radio0) {
            const status = radio0.up ? 'connected' : 'disconnected';
            const ssid = radio0.ssid || '-';
            const encryption = radio0.encryption || '-';
            const channel = radio0.channel || '-';
            const signal = radio0.signal ? `${radio0.signal} dBm` : '-';
            const clients = radio0.clients?.length || 0;

            document.getElementById('wifi-status').textContent = status;
            document.getElementById('wifi-status').className = `status-value ${status}`;
            document.getElementById('wifi-ssid').textContent = ssid;
            document.getElementById('wifi-encryption').textContent = encryption;
            document.getElementById('wifi-channel').textContent = channel;
            document.getElementById('wifi-signal').textContent = signal;
            document.getElementById('wifi-clients').textContent = clients;
        }
    }).catch(error => {
        console.error('Failed to get WiFi status:', error);
    });
}

function updateVpnStatus() {
    callUbus('network.interface', 'dump').then(response => {
        const interfaces = response.json().interface;
        const vpnInterface = interfaces.find(iface => iface.interface === 'wg0');
        
        if (vpnInterface) {
            const status = vpnInterface.up ? 'connected' : 'disconnected';
            const ipaddr = vpnInterface['ipv4-address']?.[0]?.['address'] || '-';
            const uptime = formatUptime(vpnInterface.uptime || 0);
            const type = vpnInterface.proto || '-';

            // Get kill switch status
            callUbus('uci', 'get', {config: 'firewall', section: 'vpn_killswitch'}).then(response => {
                const killswitch = response.json() ? 'Enabled' : 'Disabled';
                document.getElementById('vpn-killswitch').textContent = killswitch;
            }).catch(() => {
                document.getElementById('vpn-killswitch').textContent = 'Disabled';
            });

            // Get data transferred
            callUbus('network.interface', 'dump').then(response => {
                const stats = vpnInterface.statistics || {};
                const rx = formatBytes(stats.rx_bytes || 0);
                const tx = formatBytes(stats.tx_bytes || 0);
                document.getElementById('vpn-data').textContent = `↓${rx} ↑${tx}`;
            });

            document.getElementById('vpn-status').textContent = status;
            document.getElementById('vpn-status').className = `status-value ${status}`;
            document.getElementById('vpn-type').textContent = type;
            document.getElementById('vpn-ip').textContent = ipaddr;
            document.getElementById('vpn-uptime').textContent = uptime;
        } else {
            document.getElementById('vpn-status').textContent = 'disconnected';
            document.getElementById('vpn-status').className = 'status-value disconnected';
            document.getElementById('vpn-type').textContent = '-';
            document.getElementById('vpn-ip').textContent = '-';
            document.getElementById('vpn-uptime').textContent = '-';
            document.getElementById('vpn-killswitch').textContent = 'Disabled';
            document.getElementById('vpn-data').textContent = '-';
        }
    }).catch(error => {
        console.error('Failed to get VPN status:', error);
    });
}

// Utility functions
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update all statuses
function updateAllStatus() {
    updateWanStatus();
    updateWifiStatus();
    updateVpnStatus();
}

// Initial load
document.addEventListener('DOMContentLoaded', function() {
    updateAllStatus();
    
    // Set up refresh button
    document.getElementById('refresh-status').addEventListener('click', updateAllStatus);
    
    // Auto-refresh every 30 seconds
    setInterval(updateAllStatus, 30000);
}); 