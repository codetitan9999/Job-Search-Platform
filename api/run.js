const { executeSearchRun } = require("../lib/job-runner");
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
    const run = await executeSearchRun(config, { trigger: "manual" });

    sendJson(response, 200, {
      deploymentMode: "manual-only",
      run,
      runs: [run],
      status: buildManualStatus(run),
    });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Unexpected server error.",
    });
  }
};
