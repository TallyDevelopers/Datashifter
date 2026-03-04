import * as http from "http";
import { fetchActiveSyncConfigs, runSyncConfig, runAutomaticRetries } from "./runner.js";
import { fetchActiveCpqJobs, runCpqJob } from "./cpq-runner.js";

const INTERVAL_MS = parseInt(process.env.WORKER_INTERVAL_MS ?? "120000", 10); // default 2 min
const PORT = parseInt(process.env.PORT ?? "8080", 10);
const WORKER_SECRET = process.env.WORKER_SECRET ?? "";

// ============================================================
// Validate required environment variables on startup
// ============================================================
function validateEnv() {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TOKEN_ENCRYPTION_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[init] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// ============================================================
// Main sync loop
// ============================================================
let isRunning = false;
let lastRunAt: Date | null = null;
let lastRunDurationMs = 0;
let totalRuns = 0;
let totalSyncsExecuted = 0;
let totalCpqJobsExecuted = 0;

async function runSyncCycle() {
  if (isRunning) {
    console.log("[scheduler] Previous cycle still running — skipping this tick");
    return;
  }

  isRunning = true;
  const cycleStart = Date.now();
  console.log(`\n[scheduler] ─── Sync cycle starting at ${new Date().toISOString()} ───`);

  try {
    const configs = await fetchActiveSyncConfigs();
    console.log(`[scheduler] Found ${configs.length} active sync config(s)`);

    if (configs.length === 0) {
      console.log("[scheduler] Nothing to do.");
    } else {
      for (const config of configs) {
        try {
          console.log(`[scheduler] Running sync: "${config.name}" (${config.id})`);
          const result = await runSyncConfig(config, INTERVAL_MS);
          totalSyncsExecuted++;
          console.log(
            `[scheduler] Done: ${result.succeeded}/${result.processed} records succeeded` +
            (result.failed > 0 ? `, ${result.failed} failed` : "")
          );
        } catch (err) {
          console.error(`[scheduler] Uncaught error in sync "${config.name}":`, err);
        }
      }
    }

    // Run automatic retries for any previously failed records
    try {
      await runAutomaticRetries();
    } catch (err) {
      console.error("[scheduler] Auto-retry cycle failed:", err);
    }

    // ── CPQ/RCA integration jobs ──────────────────────────────
    try {
      const cpqJobs = await fetchActiveCpqJobs();
      console.log(`[scheduler] Found ${cpqJobs.length} active CPQ job(s)`);
      for (const job of cpqJobs) {
        try {
          console.log(`[scheduler] Running CPQ job: "${job.name}" (${job.id})`);
          const result = await runCpqJob(job, INTERVAL_MS);
          if (result.runsCompleted > 0) {
            totalCpqJobsExecuted++;
            console.log(`[scheduler] CPQ job done: ${result.stepsFailed} step(s) failed`);
          }
        } catch (err) {
          console.error(`[scheduler] Uncaught error in CPQ job "${job.name}":`, err);
        }
      }
    } catch (err) {
      console.error("[scheduler] Failed to fetch CPQ jobs:", err);
    }
  } catch (err) {
    console.error("[scheduler] Failed to fetch sync configs:", err);
  } finally {
    lastRunAt = new Date();
    lastRunDurationMs = Date.now() - cycleStart;
    totalRuns++;
    isRunning = false;
    console.log(`[scheduler] Cycle complete in ${(lastRunDurationMs / 1000).toFixed(1)}s. Next run in ${INTERVAL_MS / 1000}s.`);
  }
}

// ============================================================
// Health check HTTP server (Railway uses this to verify liveness)
// ============================================================
function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        uptime: process.uptime(),
        isRunning,
        lastRunAt: lastRunAt?.toISOString() ?? null,
        lastRunDurationMs,
        totalRuns,
        totalSyncsExecuted,
        totalCpqJobsExecuted,
        intervalMs: INTERVAL_MS,
      }));
      return;
    }

    // Protected status endpoint with more detail
    if (req.url === "/status") {
      const authHeader = req.headers["authorization"];
      if (WORKER_SECRET && authHeader !== `Bearer ${WORKER_SECRET}`) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        env: {
          SUPABASE_URL: process.env.SUPABASE_URL ? "set" : "missing",
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing",
          TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY ? "set" : "missing",
        },
        uptime: process.uptime(),
        isRunning,
        lastRunAt: lastRunAt?.toISOString() ?? null,
        lastRunDurationMs,
        totalRuns,
        totalSyncsExecuted,
        totalCpqJobsExecuted,
        intervalMs: INTERVAL_MS,
      }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(PORT, () => {
    console.log(`[health] HTTP server listening on port ${PORT}`);
  });
}

// ============================================================
// Graceful shutdown
// ============================================================
process.on("SIGTERM", () => {
  console.log("[shutdown] SIGTERM received — waiting for current cycle to finish...");
  const wait = setInterval(() => {
    if (!isRunning) {
      clearInterval(wait);
      console.log("[shutdown] Clean shutdown complete.");
      process.exit(0);
    }
  }, 1000);
});

process.on("SIGINT", () => {
  console.log("[shutdown] SIGINT received — exiting.");
  process.exit(0);
});

// ============================================================
// Entry point
// ============================================================
async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║       OrgSync Worker Starting        ║");
  console.log(`║  Interval: ${(INTERVAL_MS / 1000)}s                    ║`);
  console.log("╚══════════════════════════════════════╝");

  validateEnv();
  startHealthServer();

  // Run immediately on startup, then on interval
  await runSyncCycle();
  setInterval(runSyncCycle, INTERVAL_MS);
}

main().catch((err) => {
  console.error("[fatal] Unhandled startup error:", err);
  process.exit(1);
});
