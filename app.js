const form = document.getElementById("job-search-form");
const preview = document.getElementById("config-preview");
const resumeInput = document.getElementById("resume");
const resumeDropzone = document.getElementById("resume-dropzone");
const timezoneInput = document.getElementById("timezone");
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

function getConfiguration() {
  const autoRun = document.getElementById("autoRun").checked;
  const interval = document.getElementById("runIntervalHours").value;

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

function applyConfiguration(config) {
  document.getElementById("targetRoles").value = (config.targetRoles || []).join(", ");
  document.getElementById("excludeRoles").value = (config.excludeRoles || []).join(", ");
  document.getElementById("companies").value = (config.companies || []).join(", ");
  document.getElementById("locations").value = (config.locations || []).join(", ");
  document.getElementById("experienceLevel").value = config.experienceLevel || "";
  document.getElementById("preferredTechStack").value = config.preferredTechStack || "";
  document.getElementById("otherFilters").value = (config.otherFilters || []).join(", ");
  document.getElementById("notificationDestination").value = config.notificationDestination || "";
  document.getElementById("autoRun").checked = Boolean(config.autoRun);
  document.getElementById("runIntervalHours").value = String(config.runIntervalHours || 1);
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
    const helperText = resumeInput.files[0]
      ? "Selected locally. Save profile to upload this version."
      : "Resume stored on the server for fit scoring.";

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

  backendStatus.textContent = status?.backend === "online" ? "Online" : "Offline";
  lastRunStatus.textContent = latestRun ? formatTimestamp(latestRun.startedAt) : "No runs yet";
  nextRunStatus.textContent = scheduler.nextRunAt ? formatTimestamp(scheduler.nextRunAt) : "Not scheduled";
  schedulerState.textContent = scheduler.enabled
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

  statusPill.textContent = scheduler.enabled ? "Hourly automation armed" : "Manual run mode";
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
  payload.append("config", JSON.stringify(getConfiguration()));

  if (resumeInput.files[0]) {
    payload.append("resume", resumeInput.files[0]);
  }

  return payload;
}

async function persistProfile(showMessage = true) {
  setBusy(true, "Saving search profile to the backend...");

  try {
    const payload = await apiRequest("/api/config", {
      method: "POST",
      body: buildSavePayload(),
    });

    state.config = payload.config;
    state.status = payload.status;
    applyConfiguration(payload.config);
    lastSaved.textContent = payload.config.updatedAt
      ? `Saved ${formatTimestamp(payload.config.updatedAt)}`
      : "Saved on server";
    renderDashboard();

    if (showMessage) {
      feedback.textContent = "Search profile saved to the backend.";
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
    state.runs = runsPayload.runs || [];
    renderStatus(state.status);
    renderRuns(state.runs);
  } catch (error) {
    backendStatus.textContent = "Offline";
    statusPill.textContent = "Backend offline";
    schedulerState.textContent = "Unable to reach backend";
  }
}

async function bootstrap() {
  setBusy(true, "Connecting to backend...");

  try {
    const payload = await apiRequest("/api/bootstrap");
    state.config = payload.config;
    state.status = payload.status;
    state.runs = payload.runs || [];
    applyConfiguration(payload.config);
    lastSaved.textContent = payload.config.updatedAt
      ? `Saved ${formatTimestamp(payload.config.updatedAt)}`
      : "No saved profile yet";
    feedback.textContent =
      "Backend connected. Save the profile to store it on disk and trigger runs from the UI.";
    renderDashboard();
  } catch (error) {
    feedback.textContent = `Backend connection failed: ${error.message}`;
    statusPill.textContent = "Backend offline";
    backendStatus.textContent = "Offline";
  } finally {
    setBusy(false);
  }
}

timezoneInput.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
renderDashboard();
bootstrap();
setInterval(refreshStatus, 60000);

form.addEventListener("input", sync);
form.addEventListener("change", sync);

resumeInput.addEventListener("change", () => {
  const fileName = resumeInput.files[0]?.name || "";
  resumeInput.dataset.fileName = fileName;
  updateResumeDisplay(fileName);
  lastSaved.textContent = "Unsaved changes";
  renderDashboard();
});

function sync() {
  lastSaved.textContent = "Unsaved changes";
  renderDashboard();
}

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
    feedback.textContent = `Missing ${missing.join(", ")}. Fill those before running the backend search.`;
    statusPill.textContent = "Need required inputs";
    return;
  }

  try {
    await persistProfile(false);
    setBusy(true, "Starting manual search run...");
    const payload = await apiRequest("/api/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    state.status = payload.status;
    state.runs = payload.runs || [];
    renderDashboard();
    feedback.textContent =
      "Manual run completed. The backend recorded the run, but live job retrieval still needs company-specific portal connectors.";
  } catch (error) {
    feedback.textContent = `Run failed: ${error.message}`;
    statusPill.textContent = "Run failed";
  } finally {
    setBusy(false);
  }
});
