function computeNextRunAt(config, runs) {
  if (!config.autoRun) {
    return null;
  }

  const intervalHours = Math.max(1, Number(config.runIntervalHours) || 1);
  const intervalMs = intervalHours * 60 * 60 * 1000;
  const lastRun = runs[0];
  const anchor = lastRun?.startedAt || config.updatedAt;

  if (!anchor) {
    return null;
  }

  return new Date(new Date(anchor).getTime() + intervalMs).toISOString();
}

function createScheduler({ getConfig, getRuns, isRunInProgress, onDue, tickMs = 60_000 }) {
  let timer = null;
  let lastTickAt = "";
  let lastError = null;

  function getState() {
    const config = getConfig();
    const runs = getRuns();

    return {
      enabled: Boolean(config.autoRun),
      intervalHours: Math.max(1, Number(config.runIntervalHours) || 1),
      running: isRunInProgress(),
      lastRunAt: runs[0]?.startedAt || null,
      nextRunAt: computeNextRunAt(config, runs),
      lastTickAt: lastTickAt || null,
      lastError,
    };
  }

  async function inspect() {
    lastTickAt = new Date().toISOString();
    const state = getState();

    if (!state.enabled || state.running || !state.nextRunAt) {
      return getState();
    }

    if (Date.now() < new Date(state.nextRunAt).getTime()) {
      return getState();
    }

    try {
      await onDue();
      lastError = null;
    } catch (error) {
      lastError = {
        at: new Date().toISOString(),
        message: error.message,
      };
    }

    return getState();
  }

  function start() {
    if (!timer) {
      timer = setInterval(() => {
        inspect().catch(() => {});
      }, tickMs);
    }

    return inspect();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    getState,
    inspect,
    start,
    stop,
  };
}

module.exports = {
  createScheduler,
};
