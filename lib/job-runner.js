const crypto = require("crypto");

const { validateSearchProfile } = require("./search-profile");
const { searchCompany } = require("./connectors/generic-company");

function generateRunId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `run_${Date.now()}`;
}

async function executeSearchRun(profile, options = {}) {
  const issues = validateSearchProfile(profile);

  if (issues.length) {
    const error = new Error(`Cannot execute run. Missing ${issues.join(", ")}.`);
    error.statusCode = 400;
    throw error;
  }

  const startedAt = new Date().toISOString();
  const connectorReports = [];

  for (const company of profile.companies) {
    connectorReports.push(await searchCompany(company, profile));
  }

  const jobs = connectorReports.flatMap((report) => report.jobs || []);

  return {
    id: generateRunId(),
    trigger: options.trigger || "manual",
    status: "completed",
    startedAt,
    completedAt: new Date().toISOString(),
    summary: {
      companiesScanned: profile.companies.length,
      rolesConsidered: profile.targetRoles.length,
      adaptersReady: connectorReports.filter((report) => report.ready).length,
      adaptersPending: connectorReports.filter((report) => !report.ready).length,
      jobsFound: jobs.length,
    },
    jobs,
    connectorReports,
    notes: [
      "The backend is now saving config, scheduling runs, and recording execution history.",
      "Live company portal retrieval still needs company-specific or ATS-specific connectors.",
      profile.portalAccess === "Public and login-required portals"
        ? "Login-required portals are marked in the profile, but credential automation is not implemented yet."
        : "Public-only mode is active for connector development.",
    ],
  };
}

module.exports = {
  executeSearchRun,
};
