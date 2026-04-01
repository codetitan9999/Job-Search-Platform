const { buildManualStatus, sendJson, sendMethodNotAllowed } = require("../lib/manual-deployment");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response, ["GET"]);
    return;
  }

  sendJson(response, 200, {
    ok: true,
    deploymentMode: "manual-only",
    status: buildManualStatus(),
  });
};
