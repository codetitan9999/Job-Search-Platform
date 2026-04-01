const { parseMultipartRequest, readJsonRequest } = require("./multipart");
const { defaultSearchProfile, normalizeSearchProfile } = require("./search-profile");

function buildManualProfile(input = {}, previous = defaultSearchProfile()) {
  return normalizeSearchProfile(
    {
      ...previous,
      ...input,
      autoRun: false,
      runIntervalHours: 0,
      updatedAt: input.updatedAt || new Date().toISOString(),
    },
    previous,
  );
}

function buildManualStatus(latestRun = null) {
  return {
    backend: "online",
    runInProgress: false,
    latestRun,
    scheduler: {
      enabled: false,
      intervalHours: 0,
      running: false,
      lastRunAt: latestRun?.startedAt || null,
      nextRunAt: null,
      lastTickAt: new Date().toISOString(),
      lastError: null,
    },
  };
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload, null, 2));
}

async function readProfileFromRequest(request) {
  const contentType = request.headers["content-type"] || "";

  if (contentType.includes("multipart/form-data")) {
    const { fields, files } = await parseMultipartRequest(request);
    const rawConfig = fields.config ? JSON.parse(fields.config) : {};
    const nextProfile = buildManualProfile(rawConfig);
    const resume = files.resume || null;

    if (!resume || !resume.filename) {
      return nextProfile;
    }

    return buildManualProfile({
      ...nextProfile,
      resumeFileName: resume.filename,
      resumeContentType: resume.contentType || "",
      resumeSize: resume.data?.length || 0,
      resumeStoredFileName: "",
      resumePublicPath: "",
    });
  }

  if (contentType.includes("application/json")) {
    const body = await readJsonRequest(request);
    return buildManualProfile(body.config || body || {});
  }

  if (!contentType) {
    return buildManualProfile();
  }

  const error = new Error("Unsupported content type.");
  error.statusCode = 415;
  throw error;
}

function sendMethodNotAllowed(response, methods) {
  response.setHeader("Allow", methods.join(", "));
  sendJson(response, 405, { error: "Method not allowed." });
}

module.exports = {
  buildManualProfile,
  buildManualStatus,
  readProfileFromRequest,
  sendJson,
  sendMethodNotAllowed,
};
