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