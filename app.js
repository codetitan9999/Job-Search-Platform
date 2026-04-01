const DRAFT_STORAGE_KEY = "jobhunt-control-room:draft:v2";
const RUNS_STORAGE_KEY = "jobhunt-control-room:runs:v2";

const form = document.getElementById("job-search-form");
const preview = document.getElementById("config-preview");
const resumeInput = document.getElementById("resume");
const resumeDropzone = document.getElementById("resume-dropzone");
const timezoneInput = document.getElementById("timezone");
const autoRunInput = document.getElementById("autoRun");
const runIntervalInput = document.getElementById("runIntervalHours");
const statusPill = document.getElementById("status-pill");
const lastSaved = document.getElementById("last-saved");
const feedback = document.getElementById("action-feedback");

const roleChipList = document.getElementById("role-chip-list");
const companyChipList = document.getElementById("company-chip-list");
const notificationChipList = document.getElementById("notification-chip-list");

const quickRoleCount = document.getElementById("quick-role-count");
const quickCompanyCount = document.getElementById("quick-company-count");
const quickNotificationCount = document.getElementById("quick-notification-count");
const quickSchedule = document.getElementById("quick-schedule");

const resumeStatus = document.getElementById("resume-status");
const scheduleStatus = document.getElementById("schedule-status");
const portalStatus = document.getElementById("portal-status");
const backendStatus = document.getElementById("backend-status");
const lastRunStatus = document.getElementById("last-run-status");
const nextRunStatus = document.getElementById("next-run-status");
const schedulerState = document.getElementById("scheduler-state");
const runList = document.getElementById("run-list");

const saveButton = document.getElementById("save-config");
const runButton = document.getElementById("run-preview");

const state = {
  config: null,
  status: null,
  runs: [],
  busy: false,
  deploymentMode: "persistent",
};

function splitEntries(value) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(
    (input) => input.value,
  );
}

function getPortalAccess() {
  return form.querySelector('input[name="portalAccess"]:checked')?.value || "Public portals only";
}

function getResumeFileName() {
  return resumeInput.files[0]?.name || resumeInput.dataset.fileName || "";
}

function readLocalJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeLocalJson(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    return;
  }
}

function loadLocalDraft() {
  return readLocalJson(DRAFT_STORAGE_KEY, null);
}

function persistLocalDraft(config) {
  writeLocalJson(DRAFT_STORAGE_KEY, config);
}

function loadLocalRuns() {
  const runs = readLocalJson(RUNS_STORAGE_KEY, []);
  return Array.isArray(runs) ? runs : [];
}

function persistLocalRuns(runs) {
  writeLocalJson(RUNS_STORAGE_KEY, Array.isArray(runs) ? runs.slice(0, 10) : []);
}

function chooseNewestConfig(serverConfig, localConfig) {
  if (!localConfig) {
    return serverConfig;
  }

  if (!serverConfig) {
    return localConfig;
  }

  const serverUpdatedAt = new Date(serverConfig.updatedAt || 0).getTime();
  const localUpdatedAt = new Date(localConfig.updatedAt || 0).getTime();

  return localUpdatedAt > serverUpdatedAt ? localConfig : serverConfig;
}

function getConfiguration() {
  const autoRun = state.deploymentMode === "manual-only" ? false : autoRunInput.checked;
  const interval = runIntervalInput.value;

  return {
    resumeFileName: getResumeFileName(),
    targetRoles: splitEntries(document.getElementById("targetRoles").value),
    excludeRoles: splitEntries(document.getElementById("excludeRoles").value),
    companies: splitEntries(document.getElementById("companies").value),
    locations: splitEntries(document.getElementById("locations").value),
    workType: getCheckedValues("workType"),
    experienceLevel: document.getElementById("experienceLevel").value,
    preferredTechStack: document.getElementById("preferredTechStack").value.trim(),
    otherFilters: splitEntries(document.getElementById("otherFilters").value),
    portalAccess: getPortalAccess(),
    notificationMethod: getCheckedValues("notificationMethod"),
    notificationDestination: document.getElementById("notificationDestination").value.trim(),
    autoRun,
    runIntervalHours: autoRun ? Number(interval) : 0,
    timezone: timezoneInput.value,
    updatedAt: new Date().toISOString(),
  };
}

function applyDeploymentMode(mode) {
  state.deploymentMode = mode || "persistent";
  const manualOnly = state.deploymentMode === "manual-only";

  autoRunInput.disabled = manualOnly;
  runIntervalInput.disabled = manualOnly;

  if (manualOnly) {
    autoRunInput.checked = false;
    runIntervalInput.value = "1";
  }
}

function applyConfiguration(config) {
  document.getElementById("targetRoles").value = (config.targetRoles || []).join(", ");
  document.getElementById("excludeRoles").value = (config.excludeRoles || []).join(", ");
  document.getElementById("companies").value = (config.companies || []).join(", ");
  document.getElementById("locations").value = (config.locations || []).join(", ");
  document.getElementById("experienceLevel").value = config.experienceLevel || "";
  document.getElementById("preferredTechStack").value = config.preferredTechStack || "";
  document.getElementById("otherFilters").value = (config.otherFilters || []).join(", ");
  document.getElementById("notificationDestination").value = config.notificationDestination || "";
  autoRunInput.checked = Boolean(config.autoRun);
  runIntervalInput.value = String(config.runIntervalHours || 1);
  timezoneInput.value = config.timezone || timezoneInput.value;

  Array.from(document.querySelectorAll('input[name="workType"]')).forEach((input) => {
    input.checked = (config.workType || []).includes(input.value);
  });

  Array.from(document.querySelectorAll('input[name="notificationMethod"]')).forEach((input) => {
    input.checked = (config.notificationMethod || []).includes(input.value);
  });

  Array.from(document.querySelectorAll('input[name="portalAccess"]')).forEach((input) => {
    input.checked = input.value === config.portalAccess;
  });

  if (state.deploymentMode === "manual-only") {
    autoRunInput.checked = false;
  }

  resumeInput.value = "";
  resumeInput.dataset.fileName = config.resumeFileName || "";
  updateResumeDisplay(config.resumeFileName || "");
}

function createChip(text, accent = false) {
  const chip = document.createElement("span");
  chip.className = accent ? "chip accent" : "chip";
  chip.textContent = text;
  return chip;
}

function renderChipList(container, items, emptyMessage, accent = false) {
  container.innerHTML = "";

  if (!items.length) {
    container.className = "chip-list empty-state";
    container.textContent = emptyMessage;
    return;
  }

  container.className = "chip-list";
  items.forEach((item) => {
    container.appendChild(createChip(item, accent));
  });
}

function describeSchedule(autoRun, interval) {
  return autoRun ? `Every ${interval} hour${interval === 1 ? "" : "s"}` : "Manual only";
}

function updateResumeDisplay(fileName) {
  if (fileName) {
    let helperText = "Resume ready for fit scoring.";

    if (resumeInput.files[0]) {
      helperText = "Selected locally. Save or run to use this version.";
    } else if (state.deploymentMode === "manual-only") {
      helperText = "Resume name saved in this browser. Re-upload after refresh if needed.";
    }

    resumeDropzone.innerHTML = `<strong>${fileName}</strong><small>${helperText}</small>`;
    resumeStatus.textContent = "Attached";
    return;
  }

  resumeDropzone.innerHTML =
    "<strong>Upload your resume</strong><small>PDF or Word file. This will be used for fit scoring.</small>";
  resumeStatus.textContent = "Missing";
}

function renderConfiguration(config) {
  const scheduleText = describeSchedule(config.autoRun, config.runIntervalHours || 1);
  const notificationMethods = config.notificationMethod.length
    ? config.notificationMethod
    : ["Dashboard"];

  renderChipList(roleChipList, config.targetRoles, "Add target roles to see them here.", true);
  renderChipList(
    companyChipList,
    config.companies,
    "Add companies to build the portal scan list.",
  );
  renderChipList(notificationChipList, notificationMethods, "Dashboard");

  quickRoleCount.textContent = `${config.targetRoles.length} role${
    config.targetRoles.length === 1 ? "" : "s"
  }`;
  quickCompanyCount.textContent = `${config.companies.length} portal${
    config.companies.length === 1 ? "" : "s"
  }`;
  quickNotificationCount.textContent = notificationMethods.join(", ");
  quickSchedule.textContent = scheduleText;
  scheduleStatus.textContent = scheduleText;
  portalStatus.textContent = config.portalAccess;
  preview.textContent = JSON.stringify(config, null, 2);
}

function formatTimestamp(value) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderRuns(runs) {
  runList.innerHTML = "";

  if (!runs.length) {
    runList.className = "run-list empty-state";
    runList.textContent = "No runs yet. Save a profile and trigger the first scan.";
    return;
  }

  runList.className = "run-list";

  runs.slice(0, 6).forEach((run) => {
    const card = document.createElement("article");
    card.className = "run-card";

    const pendingLabel = `${run.summary.adaptersPending} connector${
      run.summary.adaptersPending === 1 ? "" : "s"
    } pending`;

    card.innerHTML = `
      <div class="run-card-header">
        <strong>${run.trigger === "scheduled" ? "Scheduled run" : "Manual run"}</strong>
        <span>${formatTimestamp(run.startedAt)}</span>
      </div>
      <p class="run-card-summary">
        Scanned ${run.summary.companiesScanned} compan${
          run.summary.companiesScanned === 1 ? "y" : "ies"
        }, considered ${run.summary.rolesConsidered} role${
          run.summary.rolesConsidered === 1 ? "" : "s"
        }, found ${run.summary.jobsFound} live jobs.
      </p>
      <div class="run-card-meta">
        <strong>${pendingLabel}</strong>
        <span>Status: ${run.status}</span>
      </div>
    `;

    (run.notes || []).slice(0, 2).forEach((note) => {
      const noteElement = document.createElement("div");
      noteElement.className = "run-note";
      noteElement.textContent = note;
      card.appendChild(noteElement);
    });

    runList.appendChild(card);
  });
}

function validateConfiguration(config) {
  const missing = [];

  if (!config.resumeFileName) {
    missing.push("resume");
  }

  if (!config.targetRoles.length) {
    missing.push("target roles");
  }

  if (!config.companies.length) {
    missing.push("companies");
  }

  return missing;
}

function renderStatus(status) {
  const latestRun = status?.latestRun || state.runs[0] || null;
  const scheduler = status?.scheduler || {};
  const manualOnly = state.deploymentMode === "manual-only";

  backendStatus.textContent = status?.backend === "online" ? "Online" : "Offline";
  lastRunStatus.textContent = latestRun ? formatTimestamp(latestRun.startedAt) : "No runs yet";
  nextRunStatus.textContent = scheduler.nextRunAt ? formatTimestamp(scheduler.nextRunAt) : "Not scheduled";
  schedulerState.textContent = manualOnly
    ? "Manual run mode (free deployment)"
    : scheduler.enabled
      ? `Auto-run every ${scheduler.intervalHours} hour${scheduler.intervalHours === 1 ? "" : "s"}`
      : "Manual run mode";

  if (!status || status.backend !== "online") {
    statusPill.textContent = "Backend offline";
    return;
  }

  if (status.runInProgress) {
    statusPill.textContent = "Run in progress";
    return;
  }

  statusPill.textContent = manualOnly
    ? "Manual run mode"
    : scheduler.enabled
      ? "Hourly automation armed"
      : "Manual run mode";
}

function renderDashboard() {
  const config = getConfiguration();
  renderConfiguration(config);
  renderStatus(state.status);
  renderRuns(state.runs);
}

function setBusy(isBusy, label) {
  state.busy = isBusy;
  saveButton.disabled = isBusy;
  runButton.disabled = isBusy;

  if (label) {
    feedback.textContent = label;
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function buildSavePayload() {
  const payload = new FormData();
  const config = getConfiguration();
  persistLocalDraft(config);
  payload.append("config", JSON.stringify(config));

  if (resumeInput.files[0]) {
    payload.append("resume", resumeInput.files[0]);
  }

  return payload;
}

async function persistProfile(showMessage = true) {
  const localConfig = getConfiguration();
  persistLocalDraft(localConfig);
  setBusy(true, "Saving search profile...");

  try {
    const payload = await apiRequest("/api/config", {
      method: "POST",
      body: buildSavePayload(),
    });

    const nextConfig = payload.config || localConfig;
    state.config = nextConfig;
    state.status = payload.status || state.status;
    state.deploymentMode = payload.deploymentMode || state.deploymentMode;
    applyDeploymentMode(state.deploymentMode);
    applyConfiguration(nextConfig);
    persistLocalDraft(nextConfig);
    lastSaved.textContent = nextConfig.updatedAt
      ? `Saved ${formatTimestamp(nextConfig.updatedAt)}`
      : "Saved in browser";
    renderDashboard();

    if (showMessage) {
      feedback.textContent = state.deploymentMode === "manual-only"
        ? "Search profile saved in this browser. Free deployment mode does not keep server-side files."
        : "Search profile saved to the backend.";
    }

    return payload;
  } catch (error) {
    feedback.textContent = `Save failed: ${error.message}`;
    statusPill.textContent = "Save failed";
    throw error;
  } finally {
    setBusy(false);
  }
}

async function refreshStatus() {
  try {
    const [statusPayload, runsPayload] = await Promise.all([
      apiRequest("/api/status"),
      apiRequest("/api/runs"),
    ]);

    state.status = statusPayload.status;
    const nextRuns = runsPayload.runs?.length ? runsPayload.runs : loadLocalRuns();
    state.runs = nextRuns;
    renderStatus(state.status);
    renderRuns(state.runs);
  } catch (error) {
    backendStatus.textContent = "Offline";
    statusPill.textContent = "Backend offline";
    schedulerState.textContent = "Unable to reach backend";
  }
}

async function bootstrap() {
  const localDraft = loadLocalDraft();
  const localRuns = loadLocalRuns();

  if (localDraft) {
    applyConfiguration(localDraft);
    lastSaved.textContent = localDraft.updatedAt
      ? `Draft ${formatTimestamp(localDraft.updatedAt)}`
      : "Draft loaded from browser";
  }

  if (localRuns.length) {
    state.runs = localRuns;
  }

  renderDashboard();
  setBusy(true, "Connecting to backend...");

  try {
    const payload = await apiRequest("/api/bootstrap");
    state.deploymentMode = payload.deploymentMode || "persistent";
    applyDeploymentMode(state.deploymentMode);

    const nextConfig = chooseNewestConfig(payload.config, localDraft) || getConfiguration();
    state.config = nextConfig;
    state.status = payload.status;
    state.runs = payload.runs?.length ? payload.runs : localRuns;
    applyConfiguration(nextConfig);
    persistLocalDraft(nextConfig);
    persistLocalRuns(state.runs);
    lastSaved.textContent = nextConfig.updatedAt
      ? `Saved ${formatTimestamp(nextConfig.updatedAt)}`
      : "Draft ready";
    feedback.textContent = state.deploymentMode === "manual-only"
      ? "Free deployment mode is active. Profiles and recent runs are kept in this browser, and searches run on demand."
      : "Backend connected. Save the profile to store it on the server and trigger runs from the UI.";
    renderDashboard();
  } catch (error) {
    feedback.textContent = `Backend connection failed: ${error.message}`;
    statusPill.textContent = "Backend offline";
    backendStatus.textContent = "Offline";
  } finally {
    setBusy(false);
  }
}

function sync() {
  const config = getConfiguration();
  persistLocalDraft(config);
  lastSaved.textContent = "Draft saved in browser";
  renderDashboard();
}

timezoneInput.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
applyDeploymentMode(state.deploymentMode);
renderDashboard();
bootstrap();
setInterval(refreshStatus, 60000);

form.addEventListener("input", sync);
form.addEventListener("change", sync);

resumeInput.addEventListener("change", () => {
  const fileName = resumeInput.files[0]?.name || "";
  resumeInput.dataset.fileName = fileName;
  updateResumeDisplay(fileName);
  sync();
});

saveButton.addEventListener("click", async () => {
  try {
    await persistProfile(true);
  } catch (error) {
    return;
  }
});

runButton.addEventListener("click", async () => {
  const config = getConfiguration();
  const missing = validateConfiguration(config);

  if (missing.length) {
    feedback.textContent = `Missing ${missing.join(", ")}. Fill those before running the search.`;
    statusPill.textContent = "Need required inputs";
    return;
  }

  persistLocalDraft(config);

  try {
    setBusy(true, "Starting manual search run...");
    const payload = await apiRequest("/api/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ config }),
    });

    state.status = payload.status || state.status;
    state.deploymentMode = payload.deploymentMode || state.deploymentMode;
    applyDeploymentMode(state.deploymentMode);
    state.runs = payload.runs?.length ? payload.runs : payload.run ? [payload.run] : [];
    persistLocalRuns(state.runs);
    renderDashboard();
    feedback.textContent =
      "Manual run completed. The app is deployment-ready for free manual-run hosting, but live portal connectors still need to be implemented.";
  } catch (error) {
    feedback.textContent = `Run failed: ${error.message}`;
    statusPill.textContent = "Run failed";
  } finally {
    setBusy(false);
  }
});
