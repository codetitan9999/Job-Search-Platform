const fs = require("fs");

const { defaultSearchProfile, normalizeSearchProfile } = require("./search-profile");
const { DATA_DIR, UPLOADS_DIR } = require("./runtime-paths");
const path = require("path");

const CONFIG_FILE = path.join(DATA_DIR, "search-profile.json");
const RUN_HISTORY_FILE = path.join(DATA_DIR, "run-history.json");

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  if (!fs.existsSync(CONFIG_FILE)) {
    writeJson(CONFIG_FILE, defaultSearchProfile());
  }

  if (!fs.existsSync(RUN_HISTORY_FILE)) {
    writeJson(RUN_HISTORY_FILE, []);
  }
}

function loadConfig() {
  return normalizeSearchProfile(readJson(CONFIG_FILE, defaultSearchProfile()));
}

function saveConfig(profile) {
  const normalized = normalizeSearchProfile(profile);
  writeJson(CONFIG_FILE, normalized);
  return normalized;
}

function loadRunHistory() {
  const history = readJson(RUN_HISTORY_FILE, []);
  return Array.isArray(history) ? history : [];
}

function saveRunHistory(history) {
  writeJson(RUN_HISTORY_FILE, Array.isArray(history) ? history.slice(0, 25) : []);
}

function appendRun(run) {
  const history = [run, ...loadRunHistory()].slice(0, 25);
  saveRunHistory(history);
  return history;
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function saveResumeFile(file) {
  const safeFileName = `${Date.now()}-${sanitizeFileName(file.filename || "resume.bin")}`;
  const targetPath = path.join(UPLOADS_DIR, safeFileName);
  fs.writeFileSync(targetPath, file.data);

  return {
    originalFileName: file.filename || safeFileName,
    storedFileName: safeFileName,
    publicPath: `/uploads/${safeFileName}`,
    contentType: file.contentType || "application/octet-stream",
    size: file.data.length,
  };
}

module.exports = {
  DATA_DIR,
  UPLOADS_DIR,
  appendRun,
  ensureStorage,
  loadConfig,
  loadRunHistory,
  saveConfig,
  saveResumeFile,
};
