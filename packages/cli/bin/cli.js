#!/usr/bin/env node

import { spawn } from "child_process";
import { Command } from "commander";
import path from "path";
import { fileURLToPath } from "url";

import { createExtension, releaseExtension } from "../src/commands/extension.js";
import {
    deleteApi,
    flushLogs,
    logsApi,
    monitorApi,
    reloadApi,
    restartApi,
    savePm2,
    startApi,
    statusApi,
    stopApi,
} from "../src/commands/pm2.js";
import { updateProject, updateProjectWithGit } from "../src/commands/update.js";
import { Logger } from "../src/utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program.name("buildingai").description("BuildingAI CLI tool").version("0.0.1");

program
    .command("setup")
    .description("Set up the BuildingAI project environment")
    .action(() => {
        // Invoke setup.js (executable under ESM as well)
        const setupProcess = spawn("node", [path.join(__dirname, "setup.js")], {
            stdio: "inherit",
            shell: true,
            windowsHide: true,
            env: {
                ...process.env,
                // Force color output and interactive mode
                FORCE_COLOR: "1",
                // Set CI based on TTY availability to avoid pnpm TTY errors
                CI: process.stdout.isTTY ? "false" : "true",
            },
        });

        setupProcess.on("error", (err) => {
            Logger.error(
                "Setup",
                `Failed to execute setup command: ${err instanceof Error ? err.message : String(err)}`,
            );
            process.exit(1);
        });
    });

// ==================== PM2 Process Management Commands ====================

program.command("pm2:start").description("Start API service (managed by PM2)").action(startApi);

program.command("pm2:stop").description("Stop API service").action(stopApi);

program.command("pm2:restart").description("Restart API service").action(restartApi);

program.command("pm2:reload").description("Reload API service (zero downtime)").action(reloadApi);

program.command("pm2:delete").description("Delete PM2 process").action(deleteApi);

program.command("pm2:status").description("View service status").action(statusApi);

program.command("pm2:logs").description("View service logs").action(logsApi);

program.command("pm2:monitor").description("Open PM2 monitoring dashboard").action(monitorApi);

program.command("pm2:save").description("Save PM2 process list").action(savePm2);

program.command("pm2:flush").description("Flush PM2 logs").action(flushLogs);

// ==================== Update Commands ====================

program
    .command("update")
    .description("Update project (requires manual git pull)")
    .action(updateProject);

program
    .command("update-git")
    .description("Update project with automatic git pull")
    .action(updateProjectWithGit);

// ==================== Extension Commands ====================

program
    .command("extension:create")
    .description("Create a new extension from template")
    .action(createExtension);

program
    .command("extension:release")
    .description("Release an extension to releases directory")
    .action(releaseExtension);

program.parse();
