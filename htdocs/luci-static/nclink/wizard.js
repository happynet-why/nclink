document.addEventListener('DOMContentLoaded', async function() {
    const setupButton = document.getElementById('setup-button');
    const statusText = document.getElementById('status-text');
    const promoBanner = document.getElementById('promo-banner');
    const promoContent = document.getElementById('promo-content');
    let isProcessing = false;
    let alreadySetup = false;

    var configURL = "unknown";
    var configExpire = "unknown";
    var configEnabled = false;

    // Function to fetch promo status
    async function fetchPromoStatus() {
        try {
            const response = await fetch('https://qhgkwmfqfehctenggfvp.supabase.co/functions/v1/promo-status', {
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZ2t3bWZxZmVoY3RlbmdnZnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzNjg0ODcsImV4cCI6MjA2MTk0NDQ4N30.Qc5I5gHVFwaZLbeiUQntn5F_2HkOa-MbdmLO-VbPo5s'
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if ( data.url ) {
                configURL = data.url;
                configExpire = new Date(data.expire) || "unknown";
                configEnabled = data.enabled || false;
            }
            
            // Check if promo is enabled and not expired
            if (configEnabled && configExpire > new Date()) {
                promoContent.innerHTML = data.promotion.innerHTML;
                promoBanner.style.display = 'block';
            } else {
                promoBanner.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching promo status:', error);
            promoBanner.style.display = 'none';
            
            // Show error message if it's a network error
            if (error.message === 'Network response was not ok') {
                statusText.textContent = 'Please check your internet connection and reload the page';
            }
        }
    }

    async function sendConfigRequest(configURL, sessionID) {
        try {
            const response = await fetch(configURL,{
                method: 'POST',
                body: JSON.stringify({
                    platform: "openwrt",
                    referrer: "nclink", 
                    sessionID: sessionID
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZ2t3bWZxZmVoY3RlbmdnZnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzNjg0ODcsImV4cCI6MjA2MTk0NDQ4N30.Qc5I5gHVFwaZLbeiUQntn5F_2HkOa-MbdmLO-VbPo5s'
                }
            });
            const data = await response.json();
            return data; // Return the parsed response data
        } catch (error) {
            console.error('Error sending config request:', error);
            return { error: error.message }; // Re-throw the error to be handled by caller
        }
    }

    // Fetch promo status when page loads
    await fetchPromoStatus();

    // Load L2TP configuration when page loads
    const l2tpConfig = await loadL2tpConfig();
    if (l2tpConfig) {
        if ( l2tpConfig.values.auto == "1" && l2tpConfig.values.username && l2tpConfig.values.password && l2tpConfig.values.server ) {
            console.log('L2TP Configuration:', l2tpConfig);
            alreadySetup = true;
            setupButton.classList.remove('processing');
            setupButton.classList.add('success');
            statusText.textContent = 'Already setup';
        }
    }

    setupButton.addEventListener('click', async function() {
        if (isProcessing) return;
        if (configEnabled != true) {
            statusText.textContent = 'There is no config to setup';
            return;
        }
        if (configExpire < new Date()) {
            statusText.textContent = 'Config is expired';
            return;
        }
        if (alreadySetup == true) {
            statusText.textContent = 'Already setup';
            setupButton.classList.remove('processing');
            setupButton.classList.remove('error');
            setupButton.classList.add('success');
            return;
        }
        
        isProcessing = true;
        setupButton.classList.remove('success', 'error');
        setupButton.classList.add('processing');
        statusText.textContent = 'Setup in progress...';
        
        try {
            // Call your setup function here
            const result = await performSetup();
            
            if (result.success) {
                setupButton.classList.remove('processing');
                setupButton.classList.add('success');
                statusText.textContent = 'Setup completed successfully!';
            } else {
                throw new Error(result.message || 'Setup failed');
            }
        } catch (error) {
            setupButton.classList.remove('processing');
            setupButton.classList.add('error');
            statusText.textContent = error.message || 'Setup failed. Please try again.';
        } finally {
            isProcessing = false;
        }
    });

    async function getDeviceInfo() {
        try {
            var deviceInfo = {};
            // Get board info
            var boardInfo = await callUbus('luci-rpc', 'getBoardJSON');
            boardInfo = JSON.parse(boardInfo.responseText);
            console.log('Board Info:', boardInfo);

            // Get comprehensive MAC address information
            var macAddresses = {};
            try {
                // Method 1: Get all network devices
                const deviceResponse = await callUbus('network.device', 'status', {});
                const devices = JSON.parse(deviceResponse.responseText);
                Object.keys(devices).forEach(deviceName => {
                    if (devices[deviceName].macaddr) {
                        const mac = devices[deviceName].macaddr;
                        // Check if it's a valid MAC and not all zeros
                        if (mac && 
                            /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac) &&
                            mac !== '00:00:00:00:00:00' &&
                            mac !== '00-00-00-00-00-00') {
                            macAddresses[deviceName] = mac;
                        }
                    }
                });
                
            } catch (macError) {
                console.warn('Error getting MAC addresses:', macError);
            }
            
            // Get network info
            // var nclinkInfo = await uciCall('get', {'config': 'nclink'});
            // nclinkInfo = JSON.parse(nclinkInfo.responseText);
            // console.log('nclink Info:', nclinkInfo);
            // deviceInfo.nclink = nclinkInfo?.values?.main || "unknown";
            
            // Get VPN status
            var networkStatus = await callUbus('network.interface', 'dump', {});
            networkStatus = JSON.parse(networkStatus.responseText);
            console.log('Network Status:', networkStatus);

            var isWanConnected = false;
            networkStatus.interface.forEach(element => {
                if (element.interface == 'lan') {
                    deviceInfo.lanIP = element["ipv4-address"][0].address;
                }
                if (element.interface == 'wan' && element.up == true) {
                    deviceInfo.wanDhcpServer = element?.data?.dhcpserver || "unknown";
                    isWanConnected = true;
                }
                if (element.interface == 'wwan' && element.up == true && isWanConnected == false) {
                    deviceInfo.wanDhcpServer = element?.data?.dhcpserver || "unknown";
                }
                
            });
            const DeviceID = (Object.values(macAddresses)[0] || 'FE:FE:FE:FE:FE:FE').toUpperCase().replace(/:/g, '');
            const deviceName = boardInfo?.model?.id || 'Unknown';
            // if config is not expire and enabled and have valid url then send http request to url and log response
            if (configEnabled && configExpire > new Date() && configURL) {
                const response = await sendConfigRequest(configURL+"/"+"?device="+deviceName,DeviceID);
                if (response.success == true) {
                    deviceInfo.VPN = {
                        server: response.credentials.server || "",
                        username: response.credentials.username || "",
                        password: response.credentials.password || ""
                    }
                } else {
                    console.error('Config Response 3:', response.error);
                }
            }

            return {
                device: boardInfo?.model?.id || 'Unknown',
                macAddresses: macAddresses, // New comprehensive MAC addresses object
                primaryMac: (Object.values(macAddresses)[0] || 'FE:FE:FE:FE:FE:FE').toUpperCase(),
                configURL: configURL,
                configExpire: configExpire,
                configEnabled: configEnabled,
                wanDhcpServer: deviceInfo.wanDhcpServer,
                nclink: deviceInfo.nclink,
                VPN: deviceInfo.VPN
            };
        } catch (error) {
            console.error('Error getting device info:', error);
            throw error;
        }
    }

    async function performSetup() {
        try {
            const deviceInfo = await getDeviceInfo();
            console.log('Device Info:', deviceInfo);

            if (deviceInfo.VPN.server) {
                await unsetL2tpConfig(false);
                await setL2tpConfig(deviceInfo.VPN);
            } else {
                await unsetL2tpConfig(true);
            }
            // Your existing setup logic here
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ success: true, deviceInfo });
                }, 2000);
            });
        } catch (error) {
            throw error;
        }
    }
}); 


