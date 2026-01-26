#!/usr/bin/env node

import { spawn } from "child_process";
import dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

import { Logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "../../../..");

// 加载环境变量
dotenv.config({ path: path.join(rootDir, ".env") });

// Read PM2 app name from environment variables
const PM2_APP_NAME = process.env.PM2_APP_NAME || "buildingai-api";

/**
 * Execute PM2 command
 * @param {string[]} args - PM2 command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<void>}
 */
function executePm2Command(args, options = {}) {
    return new Promise((resolve, reject) => {
        const pm2Process = spawn("pm2", args, {
            stdio: options.stdio || "inherit",
            shell: true,
            cwd: options.cwd || rootDir,
            env: {
                ...process.env,
                FORCE_COLOR: "1",
                CI: process.stdout.isTTY ? "false" : "true",
            },
            ...options,
        });

        pm2Process.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`PM2 command failed with exit code: ${code}`));
            }
        });

        pm2Process.on("error", (err) => {
            reject(new Error(`PM2 command error: ${err.message}`));
        });
    });
}

/**
 * Check whether the API dist directory exists.
 * @returns {boolean}
 */
function checkApiDist() {
    const apiDistPath = path.join(rootDir, "packages/api/dist");
    if (!fs.existsSync(apiDistPath)) {
        Logger.error(
            "Build Check",
            "API dist directory is missing. Please run 'pnpm build' first.",
        );
        return false;
    }

    const mainFilePath = path.join(apiDistPath, "main.js");
    if (!fs.existsSync(mainFilePath)) {
        Logger.error(
            "Build Check",
            "API entry file main.js is missing. Please run 'pnpm build' first.",
        );
        return false;
    }

    return true;
}

/**
 * Ensure the PM2 log directory exists.
 */
function ensureLogDirectory() {
    const logDir = path.join(rootDir, "logs/pm2");
    fs.ensureDirSync(logDir);
}

/**
 * Check if PM2 process exists
 * @param {string} appName - PM2 app name
 * @returns {Promise<boolean>}
 */
async function checkProcessExists(appName) {
    try {
        await executePm2Command(["describe", appName], { stdio: "pipe" });
        return true;
    } catch {
        return false;
    }
}

/**
 * Start the API service.
 * @param {boolean} skipExistCheck - Skip checking if process already exists
 */
export async function startApi(skipExistCheck = false) {
    try {
        // Check if --no-daemon flag is present
        const noDaemon = process.argv.includes("--no-daemon");

        Logger.info(
            "Start Service",
            `Starting BuildingAI API service${noDaemon ? " (no-daemon mode)" : ""}...`,
        );

        if (!checkApiDist()) process.exit(1);

        ensureLogDirectory();

        // Check if process already exists and delete it
        if (!skipExistCheck) {
            const exists = await checkProcessExists(process.env.PM2_APP_NAME || "buildingai-api");
            if (exists) {
                Logger.info("Start Service", "Process already exists, deleting first...");
                await executePm2Command(["delete", process.env.PM2_APP_NAME || "buildingai-api"]);
            }
        }

        const pm2Args = [
            "start",
            path.join(rootDir, "packages/api/dist/main.js"),
            "--name",
            process.env.PM2_APP_NAME || "buildingai-api",
            "--cwd",
            path.join(rootDir, "packages/api"),
            "-i",
            process.env.PM2_INSTANCES || "1",
            "--max-memory-restart",
            process.env.PM2_MAX_MEMORY || "1G",
            "-o",
            path.join(rootDir, "logs/pm2/api-out.log"),
            "-e",
            path.join(rootDir, "logs/pm2/api-error.log"),
            "--time",
            "--merge-logs",
        ];

        // Add --no-daemon flag if present
        if (noDaemon) {
            pm2Args.push("--no-daemon");
        }

        // Add autorestart option
        if (process.env.PM2_AUTORESTART === "false") {
            pm2Args.push("--no-autorestart");
        }

        // Add watch option
        if (process.env.PM2_WATCH === "true") {
            pm2Args.push("--watch");
        }

        await executePm2Command(pm2Args);

        if (!noDaemon) {
            Logger.success("Start Service", "API service started successfully.");
            Logger.log("Tip", "Use 'buildingai pm2:status' to inspect the service state.");
            Logger.log("Tip", "Use 'buildingai pm2:logs' to view service logs.");
        }
    } catch (error) {
        Logger.error(
            "Start Service",
            `Failed to start the API service: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}

/**
 * Stop the API service.
 */
export async function stopApi() {
    try {
        Logger.info("Stop Service", "Stopping BuildingAI API service...");

        const exists = await checkProcessExists(PM2_APP_NAME);
        if (!exists) {
            Logger.warning("Stop Service", "Process not found, nothing to stop.");
            return;
        }

        await executePm2Command(["stop", PM2_APP_NAME]);

        Logger.success("Stop Service", "API service stopped.");
    } catch (error) {
        Logger.error(
            "Stop Service",
            `Failed to stop the API service: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}

/**
 * Restart the API service.
 */
export async function restartApi() {
    try {
        Logger.info("Restart Service", "Restarting BuildingAI API service...");

        const exists = await checkProcessExists(PM2_APP_NAME);

        if (exists) {
            await executePm2Command(["restart", PM2_APP_NAME, "--update-env"]);
            Logger.success("Restart Service", "API service restarted.");
        } else {
            Logger.info("Restart Service", "Process not running, starting...");
            await startApi(true);
            Logger.success("Restart Service", "API service started.");
        }
    } catch (error) {
        Logger.error(
            "Restart Service",
            `Failed to restart the API service: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}

/**
 * Reload the API service (zero downtime).
 */
export async function reloadApi() {
    try {
        Logger.info("Reload Service", "Reloading BuildingAI API service (zero downtime)...");

        await executePm2Command(["reload", PM2_APP_NAME]);

        Logger.success("Reload Service", "API service reloaded.");
    } catch (error) {
        Logger.error(
            "Reload Service",
            `Failed to reload the API service: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}

/**
 * Remove the PM2 process.
 */
export async function deleteApi() {
    try {
        Logger.info("Remove Process", "Removing BuildingAI API PM2 process...");

        await executePm2Command(["delete", PM2_APP_NAME]);

        Logger.success("Remove Process", "PM2 process removed.");
    } catch (error) {
        Logger.error(
            "Remove Process",
            `Failed to remove the PM2 process: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

/**
 * Inspect the service status.
 */
export async function statusApi() {
    try {
        await executePm2Command(["list"]);
    } catch (error) {
        Logger.error(
            "Service Status",
            `Failed to inspect service status: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}

/**
 * Inspect service logs.
 */
export async function logsApi() {
    try {
        Logger.info("Service Logs", "Displaying PM2 logs...");
        await executePm2Command(["logs", PM2_APP_NAME, "--lines", "100"]);
    } catch (error) {
        Logger.error(
            "Service Logs",
            `Failed to inspect service logs: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}

/**
 * Open the PM2 monitoring dashboard.
 */
export async function monitorApi() {
    try {
        Logger.info("Monitoring", "Opening PM2 monitoring dashboard...");
        await executePm2Command(["monit"]);
    } catch (error) {
        Logger.error(
            "Monitoring",
            `Failed to open monitoring dashboard: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}

/**
 * Save the PM2 process list.
 */
export async function savePm2() {
    try {
        Logger.info("Save Processes", "Saving PM2 process list...");

        await executePm2Command(["save"]);

        Logger.success("Save Processes", "PM2 process list saved.");
        Logger.log("Tip", "After a restart, use 'pm2 resurrect' to restore processes.");
    } catch (error) {
        Logger.error(
            "Save Processes",
            `Failed to save the PM2 process list: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}

/**
 * Flush PM2 logs.
 */
export async function flushLogs() {
    try {
        Logger.info("Flush Logs", "Flushing PM2 logs...");

        await executePm2Command(["flush", PM2_APP_NAME]);

        Logger.success("Flush Logs", "PM2 logs flushed.");
    } catch (error) {
        Logger.error(
            "Flush Logs",
            `Failed to flush logs: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}
