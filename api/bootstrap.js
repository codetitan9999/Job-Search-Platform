const { buildManualProfile, buildManualStatus, sendJson, sendMethodNotAllowed } = require("../lib/manual-deployment");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response, ["GET"]);
    return;
  }

  sendJson(response, 200, {
    deploymentMode: "manual-only",
    config: buildManualProfile(),
    runs: [],
    status: buildManualStatus(),
  });
};
