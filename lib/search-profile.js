function defaultSearchProfile() {
  return {
    resumeFileName: "",
    resumeStoredFileName: "",
    resumePublicPath: "",
    resumeContentType: "",
    resumeSize: 0,
    targetRoles: [],
    excludeRoles: [],
    companies: [],
    locations: [],
    workType: [],
    experienceLevel: "",
    preferredTechStack: "",
    otherFilters: [],
    portalAccess: "Public portals only",
    notificationMethod: ["Dashboard"],
    notificationDestination: "",
    autoRun: true,
    runIntervalHours: 1,
    timezone: "UTC",
    updatedAt: "",
  };
}

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeArray(value, fallback = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function normalizeInterval(value, fallback = 1) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function normalizeSearchProfile(input = {}, previous = defaultSearchProfile()) {
  const base = {
    ...defaultSearchProfile(),
    ...previous,
  };

  return {
    ...base,
    resumeFileName: normalizeString(input.resumeFileName, base.resumeFileName),
    resumeStoredFileName: normalizeString(input.resumeStoredFileName, base.resumeStoredFileName),
    resumePublicPath: normalizeString(input.resumePublicPath, base.resumePublicPath),
    resumeContentType: normalizeString(input.resumeContentType, base.resumeContentType),
    resumeSize: Number.isFinite(Number(input.resumeSize)) ? Number(input.resumeSize) : base.resumeSize,
    targetRoles: normalizeArray(input.targetRoles, base.targetRoles),
    excludeRoles: normalizeArray(input.excludeRoles, base.excludeRoles),
    companies: normalizeArray(input.companies, base.companies),
    locations: normalizeArray(input.locations, base.locations),
    workType: normalizeArray(input.workType, base.workType),
    experienceLevel: normalizeString(input.experienceLevel, base.experienceLevel),
    preferredTechStack: normalizeString(input.preferredTechStack, base.preferredTechStack),
    otherFilters: normalizeArray(input.otherFilters, base.otherFilters),
    portalAccess: normalizeString(input.portalAccess, base.portalAccess) || "Public portals only",
    notificationMethod: normalizeArray(input.notificationMethod, base.notificationMethod),
    notificationDestination: normalizeString(
      input.notificationDestination,
      base.notificationDestination,
    ),
    autoRun: normalizeBoolean(input.autoRun, base.autoRun),
    runIntervalHours: normalizeInterval(input.runIntervalHours, base.runIntervalHours || 1),
    timezone: normalizeString(input.timezone, base.timezone) || "UTC",
    updatedAt: normalizeString(input.updatedAt, base.updatedAt),
  };
}

function validateSearchProfile(profile) {
  const missing = [];

  if (!profile.resumeFileName) {
    missing.push("resume");
  }

  if (!profile.targetRoles.length) {
    missing.push("target roles");
  }

  if (!profile.companies.length) {
    missing.push("companies");
  }

  return missing;
}

module.exports = {
  defaultSearchProfile,
  normalizeSearchProfile,
  validateSearchProfile,
};
