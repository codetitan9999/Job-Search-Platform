function buildQueryPlan(company, profile) {
  return {
    company,
    targetRoles: profile.targetRoles.slice(0, 6),
    excludeRoles: profile.excludeRoles.slice(0, 6),
    locations: profile.locations.slice(0, 6),
    workType: profile.workType,
    experienceLevel: profile.experienceLevel,
    portalAccess: profile.portalAccess,
  };
}

async function searchCompany(company, profile) {
  return {
    company,
    connector: "generic-scaffold",
    ready: false,
    status: "adapter-needed",
    jobs: [],
    queryPlan: buildQueryPlan(company, profile),
    notes: [
      `No company-specific portal connector is configured for ${company} yet.`,
      "Replace this scaffold with a public ATS or direct careers-page adapter to retrieve live jobs.",
    ],
  };
}

module.exports = {
  searchCompany,
};
