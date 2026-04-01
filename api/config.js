const {
  buildManualStatus,
  readProfileFromRequest,
  sendJson,
  sendMethodNotAllowed,
} = require("../lib/manual-deployment");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    sendMethodNotAllowed(response, ["POST"]);
    return;
  }

  try {
    const config = await readProfileFromRequest(request);

    sendJson(response, 200, {
      deploymentMode: "manual-only",
      config,
      status: buildManualStatus(),
    });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Unexpected server error.",
    });
  }
};
