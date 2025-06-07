module("luci.controller.nclink", package.seeall)

function index()
  entry({"admin", "services", "linkmask"}, firstchild(), "LinkMask", 30)
  entry({"admin", "services", "linkmask", "settings"}, template("nclink/nclink"), "Settings", 10)
  entry({"admin", "services", "linkmask", "status"}, template("nclink/status"), "Status", 20)
  entry({"admin", "services", "linkmask", "wizard"}, template("nclink/wizard"), "Wizard", 5)
  entry({"admin", "nclink", "ubus_proxy"}, call("action_ubus_proxy"), "UBUS Proxy", 10).dependent = false
end


function action_ubus_proxy()
  local http = require "luci.http"
  local ubus = require "ubus"
  local json = require "luci.jsonc"

  local conn = ubus.connect()
  if not conn then
      http.status(500, "Failed to connect to UBUS")
      return
  end

  -- Read request body (UBUS call parameters)
  local request_data = http.content()
  local request_json = json.parse(request_data or "{}")

  local object = request_json.object
  local method = request_json.method
  local params = request_json.params or {}

  if not object or not method then
      http.status(400, "Missing 'object' or 'method' in request")
      return
  end

  -- Call UBUS with requested parameters
  local result, err = conn:call(object, method, params)
  conn:close()

  -- Log the result for debugging
  if result then
      print("UBUS call result:", result)
  else
      print("UBUS call error:", err)
  end

  -- Adjust error handling
  if err then
      http.status(403, "UBUS call failed: " .. err)
      return
  end

  -- Consider an empty result as a success if no error is present
  http.prepare_content("application/json")
  http.write_json(result or { message = "Command executed successfully" })
end