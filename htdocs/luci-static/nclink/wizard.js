document.addEventListener('DOMContentLoaded', async function() {
    const setupButton = document.getElementById('setup-button');
    const statusText = document.getElementById('status-text');
    const promoBanner = document.getElementById('promo-banner');
    const promoContent = document.getElementById('promo-content');
    let isProcessing = false;

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

    // Fetch promo status when page loads
    await fetchPromoStatus();

    setupButton.addEventListener('click', async function() {
        if (isProcessing) return;
        
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

            
            // Get network info
            var nclinkInfo = await uciCall('get', {'config': 'nclink'});
            nclinkInfo = JSON.parse(nclinkInfo.responseText);
            console.log('nclink Info:', nclinkInfo);
            deviceInfo.nclink = nclinkInfo?.values?.main || "unknown";
            
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
            

            return {
                device: boardInfo?.model?.id || 'Unknown',
                mac: boardInfo?.network?.wan?.macaddr || 'Unknown',
                configURL: configURL,
                configExpire: configExpire,
                configEnabled: configEnabled,
                wanDhcpServer: deviceInfo.wanDhcpServer,
                nclink: deviceInfo.nclink
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


