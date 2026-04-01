const fs = require("fs");
const http = require("http");
const path = require("path");

const { executeSearchRun } = require("./lib/job-runner");
const { parseMultipartRequest, readJsonRequest } = require("./lib/multipart");
const { createScheduler } = require("./lib/scheduler");
const { normalizeSearchProfile, validateSearchProfile } = require("./lib/search-profile");
const {
  UPLOADS_DIR,
  appendRun,
  ensureStorage,
  loadConfig,
  loadRunHistory,
  saveConfig,
  saveResumeFile,
} = require("./lib/storage");
const { APP_ROOT } = require("./lib/runtime-paths");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"],
]);

ensureStorage();

let activeRunPromise = null;

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendError(response, error) {
  const statusCode = error.statusCode || 500;
  sendJson(response, statusCode, {
    error: error.message || "Unexpected server error.",
  });
}

function resolvePublicFile(requestPath) {
  const fileName = PUBLIC_FILES.get(requestPath);

  if (!fileName) {
    return null;
  }

  return path.join(APP_ROOT, fileName);
}

function serveFile(filePath, response, cacheControl = "public, max-age=60") {
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": getContentType(filePath),
    "Cache-Control": cacheControl,
  });

  fs.createReadStream(filePath).pipe(response);
}

function serveUpload(requestPath, response) {
  const fileName = path.basename(requestPath.replace(/^\/uploads\//, ""));

  if (!fileName || fileName === "." || fileName === "..") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  serveFile(path.join(UPLOADS_DIR, fileName), response, "no-store");
}

function serveStatic(requestPath, response) {
  if (requestPath.startsWith("/uploads/")) {
    serveUpload(requestPath, response);
    return;
  }

  serveFile(resolvePublicFile(requestPath), response);
}

function buildStatus(runs = loadRunHistory()) {
  return {
    backend: "online",
    runInProgress: Boolean(activeRunPromise),
    latestRun: runs[0] || null,
    scheduler: scheduler.getState(),
  };
}

function buildBootstrap() {
  const runs = loadRunHistory();

  return {
    config: loadConfig(),
    runs,
    status: buildStatus(runs),
  };
}

async function runSearch(trigger = "manual") {
  if (activeRunPromise) {
    return activeRunPromise;
  }

  activeRunPromise = (async () => {
    const profile = loadConfig();
    const issues = validateSearchProfile(profile);

    if (issues.length) {
      const error = new Error(`Cannot run search yet. Missing ${issues.join(", ")}.`);
      error.statusCode = 400;
      throw error;
    }

    const run = await executeSearchRun(profile, { trigger });
    appendRun(run);
    return run;
  })();

  try {
    return await activeRunPromise;
  } finally {
    activeRunPromise = null;
  }
}

function applyUploadedResume(nextProfile, upload) {
  if (!upload || !upload.filename) {
    return nextProfile;
  }

  const savedResume = saveResumeFile(upload);

  return normalizeSearchProfile({
    ...nextProfile,
    resumeFileName: savedResume.originalFileName,
    resumeStoredFileName: savedResume.storedFileName,
    resumePublicPath: savedResume.publicPath,
    resumeContentType: savedResume.contentType,
    resumeSize: savedResume.size,
  });
}

async function handleConfigSave(request, response) {
  const contentType = request.headers["content-type"] || "";
  const currentProfile = loadConfig();
  let incomingProfile = {};
  let resumeUpload = null;

  if (contentType.includes("multipart/form-data")) {
    const { fields, files } = await parseMultipartRequest(request);
    incomingProfile = fields.config ? JSON.parse(fields.config) : {};
    resumeUpload = files.resume || null;
  } else if (contentType.includes("application/json")) {
    incomingProfile = await readJsonRequest(request);
  } else {
    const error = new Error("Unsupported content type for config save.");
    error.statusCode = 415;
    throw error;
  }

  let nextProfile = normalizeSearchProfile(
    {
      ...currentProfile,
      ...incomingProfile,
      updatedAt: new Date().toISOString(),
    },
    currentProfile,
  );

  nextProfile = applyUploadedResume(nextProfile, resumeUpload);
  nextProfile = saveConfig(nextProfile);
  await scheduler.inspect();

  sendJson(response, 200, {
    config: nextProfile,
    status: buildStatus(),
  });
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/healthz") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && pathname === "/api/bootstrap") {
    sendJson(response, 200, buildBootstrap());
    return;
  }

  if (request.method === "GET" && pathname === "/api/config") {
    sendJson(response, 200, { config: loadConfig() });
    return;
  }

  if (request.method === "GET" && pathname === "/api/runs") {
    sendJson(response, 200, { runs: loadRunHistory() });
    return;
  }

  if (request.method === "GET" && pathname === "/api/status") {
    sendJson(response, 200, { status: buildStatus() });
    return;
  }

  if (request.method === "POST" && pathname === "/api/config") {
    await handleConfigSave(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/run") {
    const run = await runSearch("manual");
    await scheduler.inspect();
    sendJson(response, 200, {
      run,
      runs: loadRunHistory(),
      status: buildStatus(),
    });
    return;
  }

  const error = new Error("API route not found.");
  error.statusCode = 404;
  throw error;
}

const scheduler = createScheduler({
  getConfig: loadConfig,
  getRuns: loadRunHistory,
  isRunInProgress: () => Boolean(activeRunPromise),
  onDue: async () => {
    await runSearch("scheduled");
  },
});

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);

    if (request.method === "GET" && url.pathname === "/healthz") {
      sendJson(response, 200, { ok: true, status: buildStatus() });
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname);
      return;
    }

    serveStatic(url.pathname, response);
  } catch (error) {
    sendError(response, error);
  }
});

scheduler.start().catch((error) => {
  console.error("Scheduler startup error:", error);
});

server.listen(PORT, HOST, () => {
  console.log(`JobHunt server running at http://${HOST}:${PORT}`);
});

function shutdown() {
  scheduler.stop();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
