async function setL2tpConfig(l2tpConfig) {
    
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
        await callUbus('network', 'restart');
        console.log('L2TP interface restarted successfully');

        return true;
    } catch (error) {
        console.error('Failed to set up L2TP configuration:', error);
        return false;
    }
}

async function unsetL2tpConfig(doCommit = true) {
    try {
        // Remove L2TP interface
        await uciDelete('network', 'l2tp');
        
        // Remove firewall zone
        await uciDelete('firewall', 'l2tp_zone');
        
        // Remove forwarding rule
        await uciDelete('firewall', 'l2tp_forward');

        // Commit changes
        if (doCommit) {
            await uciCommit('firewall');
            await uciCommit('network');
        }

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
        const l2tpConfig = JSON.parse(response.responseText) ;

        if (!l2tpConfig) {
            console.error('L2TP configuration not found');
            return;
        }
        return l2tpConfig;
    } catch (error) {
        console.error('Failed to retrieve L2TP configuration:', error);
    }
}
//---------------------------------------------------------------------------------//
