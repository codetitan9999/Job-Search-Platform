const path = require("path");

const APP_ROOT = path.resolve(__dirname, "..");
const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT || APP_ROOT);
const DATA_DIR = path.join(STORAGE_ROOT, "data");
const UPLOADS_DIR = path.join(STORAGE_ROOT, "uploads");

module.exports = {
  APP_ROOT,
  DATA_DIR,
  STORAGE_ROOT,
  UPLOADS_DIR,
};
