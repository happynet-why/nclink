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