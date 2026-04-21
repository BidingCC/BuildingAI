import { DictService } from "@buildingai/dict";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { execFile } from "child_process";
import fs from "fs-extra";
import path from "path";
import pm2 from "pm2";
import { pipeline } from "stream";
import { promisify } from "util";
import { createGzip } from "zlib";

import type { Pm2LogRotateConfigDto, Pm2LogRotatePreset } from "../dto/pm2-operation.dto";

type BdProcessStatus =
    | "online"
    | "stopping"
    | "stopped"
    | "launching"
    | "errored"
    | "one-launch-status"
    | "waiting_restart";

/**
 * PM2 process information (simplified from official ProcessDescription)
 */
export interface Pm2ProcessInfo {
    name: string;
    pid: number;
    status: BdProcessStatus;
    cpu: number;
    memory: number;
    uptime: number;
    restarts: number;
}

/**
 * Simplified PM2 list item for API response
 */
export interface Pm2ListItem {
    pid: number;
    name: string;
    pm_id: number;
    monit: {
        memory: number;
        cpu: number;
    };
    uptime: string;
    status: BdProcessStatus;
}

/**
 * PM2 operation result
 */
export interface Pm2OperationResult<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface Pm2LogRotateConfig {
    enabled: boolean;
    maxSize: string;
    retain: number;
    compress: boolean;
    preset: Pm2LogRotatePreset;
    rotateInterval: string;
    timezone: string;
    archiveByMonth: boolean;
    moduleInstalled?: boolean;
}

export interface Pm2LogRotateStatus {
    installed: boolean;
    config: Pm2LogRotateConfig;
    message?: string;
}

export interface Pm2LogRotateApplyResult {
    installed: boolean;
    applied: boolean;
    config: Pm2LogRotateConfig;
}

const execFileAsync = promisify(execFile);
const pipelineAsync = promisify(pipeline);

const PM2_LOG_ROTATE_GROUP = "pm2_config";
const PM2_LOG_ROTATE_KEY = "log_rotate";
const PM2_LOG_ROTATE_MODULE = "pm2-logrotate";

const DEFAULT_LOG_ROTATE_CONFIG: Pm2LogRotateConfig = {
    enabled: true,
    maxSize: "50M",
    retain: 14,
    compress: true,
    preset: "daily",
    rotateInterval: "0 0 * * *",
    timezone: "Asia/Shanghai",
    archiveByMonth: true,
};

const ROTATE_INTERVAL_BY_PRESET: Record<Exclude<Pm2LogRotatePreset, "custom">, string> = {
    hourly: "0 * * * *",
    "every-6-hours": "0 */6 * * *",
    daily: "0 0 * * *",
    weekly: "0 0 * * 0",
    monthly: "0 0 1 * *",
};

/**
 * PM2 Service
 * Provides unified PM2 process management functionality
 */
@Injectable()
export class Pm2Service implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(Pm2Service.name);
    private readonly pm2AppName: string;
    private isConnected = false;
    private archiveTimer?: NodeJS.Timeout;

    constructor(private readonly dictService: DictService) {
        this.pm2AppName = process.env.PM2_APP_NAME || "buildingai-api";
    }

    onModuleInit(): void {
        setTimeout(() => {
            void this.archiveRotatedLogsByMonth().catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Initial archive PM2 rotated logs failed: ${message}`);
            });
        }, 5_000).unref?.();

        this.archiveTimer = setInterval(() => {
            void this.archiveRotatedLogsByMonth().catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Archive PM2 rotated logs failed: ${message}`);
            });
        }, 60 * 1000);

        this.archiveTimer.unref?.();
    }

    onModuleDestroy(): void {
        if (this.archiveTimer) {
            clearInterval(this.archiveTimer);
        }
    }

    /**
     * Execute a PM2 CLI command. Some module-management operations such as
     * pm2-logrotate installation/configuration are only exposed through CLI.
     */
    private async runPm2Command(args: string[]): Promise<{ stdout: string; stderr: string }> {
        const { stdout, stderr } = await execFileAsync("pm2", args, {
            cwd: process.cwd(),
            env: {
                ...process.env,
                FORCE_COLOR: "0",
            },
            maxBuffer: 1024 * 1024,
        });

        return {
            stdout: stdout?.toString() ?? "",
            stderr: stderr?.toString() ?? "",
        };
    }

    private normalizeLogRotateConfig(
        config?: Partial<Pm2LogRotateConfigDto | Pm2LogRotateConfig> | null,
    ): Pm2LogRotateConfig {
        const next = {
            ...DEFAULT_LOG_ROTATE_CONFIG,
            ...(config ?? {}),
        };

        const preset = next.preset ?? DEFAULT_LOG_ROTATE_CONFIG.preset;
        const rotateInterval =
            preset === "custom"
                ? next.rotateInterval || DEFAULT_LOG_ROTATE_CONFIG.rotateInterval
                : ROTATE_INTERVAL_BY_PRESET[preset];

        return {
            enabled: next.enabled ?? DEFAULT_LOG_ROTATE_CONFIG.enabled,
            maxSize: String(next.maxSize || DEFAULT_LOG_ROTATE_CONFIG.maxSize).toUpperCase(),
            retain: Number(next.retain || DEFAULT_LOG_ROTATE_CONFIG.retain),
            compress: next.compress ?? DEFAULT_LOG_ROTATE_CONFIG.compress,
            preset,
            rotateInterval,
            timezone: String(next.timezone || DEFAULT_LOG_ROTATE_CONFIG.timezone),
            archiveByMonth: next.archiveByMonth ?? DEFAULT_LOG_ROTATE_CONFIG.archiveByMonth,
        };
    }

    private getLogDir(): string {
        const envLogDir = process.env.PM2_LOG_DIR || "../../logs/pm2";
        const cwd = process.cwd();
        const candidates = [
            path.resolve(cwd, envLogDir),
            path.resolve(cwd, "logs/pm2"),
            path.resolve(cwd, "../..", "logs/pm2"),
        ];

        const existing = candidates.find((candidate) => fs.existsSync(candidate));
        if (existing) return existing;

        return cwd.endsWith(path.join("packages", "api"))
            ? path.resolve(cwd, "../..", "logs/pm2")
            : path.resolve(cwd, "logs/pm2");
    }

    private isActiveLogFile(fileName: string): boolean {
        return ["api-out.log", "api-error.log", "api-combined.log"].includes(fileName);
    }

    private isManagedRotatedLogFile(fileName: string): boolean {
        if (this.isActiveLogFile(fileName)) return false;
        return /^api-(out|error|combined)(?:\.|_|-).+/.test(fileName);
    }

    private getRotatedLogFamily(fileName: string): string | null {
        const matched = fileName.match(/^(api-(out|error|combined))(?:\.|_|-).+/);
        return matched?.[1] ?? null;
    }

    private formatMonthFolder(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
    }

    private async resolveArchiveTargetPath(targetDir: string, fileName: string): Promise<string> {
        const parsed = path.parse(fileName);
        let candidate = path.join(targetDir, fileName);
        let index = 1;

        while (await fs.pathExists(candidate)) {
            candidate = path.join(targetDir, `${parsed.name}-${index}${parsed.ext}`);
            index++;
        }

        return candidate;
    }

    private async moveArchivedLog(
        sourcePath: string,
        targetDir: string,
        fileName: string,
        compress: boolean,
    ): Promise<void> {
        const targetFileName = compress && !fileName.endsWith(".gz") ? `${fileName}.gz` : fileName;
        const targetPath = await this.resolveArchiveTargetPath(targetDir, targetFileName);

        if (!compress || fileName.endsWith(".gz")) {
            await fs.move(sourcePath, targetPath);
            return;
        }

        await pipelineAsync(
            fs.createReadStream(sourcePath),
            createGzip(),
            fs.createWriteStream(targetPath),
        );
        await fs.remove(sourcePath);
    }

    private async cleanupArchivedLogsByRetain(logDir: string, retain: number): Promise<number> {
        const families = new Map<string, Array<{ path: string; mtime: number }>>();
        const entries = await fs.readdir(logDir, { withFileTypes: true });

        const scanDir = async (dir: string) => {
            const items = await fs.readdir(dir, { withFileTypes: true });
            for (const item of items) {
                if (!item.isFile()) continue;
                if (this.isActiveLogFile(item.name)) continue;
                if (!this.isManagedRotatedLogFile(item.name)) continue;

                const family = this.getRotatedLogFamily(item.name);
                if (!family) continue;

                const filePath = path.join(dir, item.name);
                const stat = await fs.stat(filePath);
                const logs = families.get(family) ?? [];
                logs.push({
                    path: filePath,
                    mtime: stat.mtimeMs,
                });
                families.set(family, logs);
            }
        };

        await scanDir(logDir);

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (!/^\d{4}-\d{2}$/.test(entry.name)) continue;
            await scanDir(path.join(logDir, entry.name));
        }

        let removed = 0;
        for (const logs of families.values()) {
            logs.sort((a, b) => b.mtime - a.mtime);
            const expiredLogs = logs.slice(retain);
            for (const log of expiredLogs) {
                await fs.remove(log.path);
                removed++;
            }
        }

        return removed;
    }

    /**
     * Move rotated PM2 API logs into logs/pm2/YYYY-MM folders.
     * Active log files stay in the root log directory so PM2 can keep writing.
     */
    async archiveRotatedLogsByMonth(): Promise<
        Pm2OperationResult<{ moved: number; removed: number; logDir: string }>
    > {
        try {
            const stored = await this.dictService.get<Partial<Pm2LogRotateConfig>>(
                PM2_LOG_ROTATE_KEY,
                DEFAULT_LOG_ROTATE_CONFIG,
                PM2_LOG_ROTATE_GROUP,
            );
            const config = this.normalizeLogRotateConfig(stored);

            if (!config.archiveByMonth) {
                return {
                    success: true,
                    data: {
                        moved: 0,
                        removed: 0,
                        logDir: this.getLogDir(),
                    },
                };
            }

            const logDir = this.getLogDir();
            if (!(await fs.pathExists(logDir))) {
                return {
                    success: true,
                    data: {
                        moved: 0,
                        removed: 0,
                        logDir,
                    },
                };
            }

            const entries = await fs.readdir(logDir, { withFileTypes: true });
            let moved = 0;

            for (const entry of entries) {
                if (!entry.isFile()) continue;
                if (this.isActiveLogFile(entry.name)) continue;
                if (!this.isManagedRotatedLogFile(entry.name)) continue;

                const sourcePath = path.join(logDir, entry.name);
                const stat = await fs.stat(sourcePath);
                const monthDir = path.join(logDir, this.formatMonthFolder(stat.mtime));
                await fs.ensureDir(monthDir);

                await this.moveArchivedLog(sourcePath, monthDir, entry.name, config.compress);
                moved++;
            }

            const removed = await this.cleanupArchivedLogsByRetain(logDir, config.retain);

            return {
                success: true,
                data: {
                    moved,
                    removed,
                    logDir,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to archive PM2 rotated logs: ${message}`);
            return {
                success: false,
                message,
            };
        }
    }

    private validateLogRotateConfig(config: Pm2LogRotateConfig): void {
        if (!/^[1-9]\d*(K|M|G)$/i.test(config.maxSize)) {
            throw new Error("日志最大大小格式不正确，请使用 50M、1G 这类格式");
        }

        if (!Number.isInteger(config.retain) || config.retain < 1 || config.retain > 365) {
            throw new Error("日志保留份数必须是 1 到 365 之间的整数");
        }

        if (!/^[A-Za-z_]+\/[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)?$/.test(config.timezone)) {
            throw new Error("时区格式不正确，请使用 Asia/Shanghai 这类 IANA 时区");
        }

        if (!this.isValidCronExpression(config.rotateInterval)) {
            throw new Error("日志切割时间表达式格式不正确，请使用 5 段 cron 表达式");
        }
    }

    private isValidCronExpression(expression: string): boolean {
        const parts = expression.trim().split(/\s+/);
        if (parts.length !== 5) return false;

        return parts.every((part) => /^[\d*,/-]+$/.test(part));
    }

    private async isLogRotateInstalled(): Promise<boolean> {
        try {
            await this.runPm2Command(["describe", PM2_LOG_ROTATE_MODULE]);
            return true;
        } catch {
            return false;
        }
    }

    private async installLogRotateIfNeeded(): Promise<void> {
        const installed = await this.isLogRotateInstalled();
        if (installed) return;

        this.logger.log("Installing PM2 logrotate module...");
        await this.runPm2Command(["install", PM2_LOG_ROTATE_MODULE]);
    }

    private async uninstallLogRotateIfInstalled(): Promise<void> {
        const installed = await this.isLogRotateInstalled();
        if (!installed) return;

        this.logger.log("Uninstalling PM2 logrotate module...");
        await this.runPm2Command(["uninstall", PM2_LOG_ROTATE_MODULE]);
    }

    /**
     * Connect to PM2 daemon
     */
    private async connect(): Promise<void> {
        if (this.isConnected) return;

        return new Promise((resolve, reject) => {
            pm2.connect((err) => {
                if (err) {
                    this.logger.error("Failed to connect to PM2", err);
                    reject(err);
                } else {
                    this.isConnected = true;
                    resolve();
                }
            });
        });
    }

    /**
     * Disconnect from PM2 daemon
     */
    private disconnect(): void {
        if (this.isConnected) {
            pm2.disconnect();
            this.isConnected = false;
        }
    }

    /**
     * Get process list from PM2
     */
    private async getProcessList(): Promise<pm2.ProcessDescription[]> {
        return new Promise((resolve, reject) => {
            pm2.list((err, list) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(list);
                }
            });
        });
    }

    /**
     * Check if PM2 is available
     */
    isPm2Available(): boolean {
        return true; // PM2 is installed as a dependency
    }

    /**
     * Execute PM2 operation with proper connection handling
     */
    private async executePm2Operation<T>(
        operation: () => Promise<T>,
    ): Promise<Pm2OperationResult<T>> {
        try {
            await this.connect();
            const result = await operation();
            this.disconnect();
            return {
                success: true,
                data: result,
            };
        } catch (error) {
            this.disconnect();
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`PM2 operation failed: ${errorMessage}`);
            return {
                success: false,
                message: errorMessage,
            };
        }
    }

    /**
     * Restart PM2 process
     * @param appName Optional app name, uses default if not provided
     */
    async restart(appName?: string): Promise<Pm2OperationResult> {
        const targetApp = appName || this.pm2AppName;
        this.logger.log(`Restarting PM2 process: ${targetApp}`);

        return this.executePm2Operation(async () => {
            return new Promise<pm2.Proc>((resolve, reject) => {
                pm2.restart(targetApp, (err, proc) => {
                    if (err) reject(err);
                    else {
                        this.logger.log(`PM2 process restarted successfully: ${targetApp}`);
                        resolve(proc);
                    }
                });
            });
        });
    }

    /**
     * Reload PM2 process (zero downtime)
     * @param appName Optional app name, uses default if not provided
     */
    async reload(appName?: string): Promise<Pm2OperationResult> {
        const targetApp = appName || this.pm2AppName;
        this.logger.log(`Reloading PM2 process: ${targetApp}`);

        return this.executePm2Operation(async () => {
            return new Promise<pm2.Proc>((resolve, reject) => {
                pm2.reload(targetApp, (err, proc) => {
                    if (err) reject(err);
                    else {
                        this.logger.log(`PM2 process reloaded successfully: ${targetApp}`);
                        resolve(proc);
                    }
                });
            });
        });
    }

    /**
     * Stop PM2 process
     * @param appName Optional app name, uses default if not provided
     */
    async stop(appName?: string): Promise<Pm2OperationResult> {
        const targetApp = appName || this.pm2AppName;
        this.logger.log(`Stopping PM2 process: ${targetApp}`);

        return this.executePm2Operation(async () => {
            return new Promise<pm2.Proc>((resolve, reject) => {
                pm2.stop(targetApp, (err, proc) => {
                    if (err) reject(err);
                    else {
                        this.logger.log(`PM2 process stopped successfully: ${targetApp}`);
                        resolve(proc);
                    }
                });
            });
        });
    }

    /**
     * Start PM2 process with config
     * @param configPath PM2 config file path
     */
    async start(configPath: string): Promise<Pm2OperationResult> {
        this.logger.log(`Starting PM2 process with config: ${configPath}`);

        return this.executePm2Operation(async () => {
            return new Promise<pm2.Proc>((resolve, reject) => {
                pm2.start(configPath, (err, proc) => {
                    if (err) reject(err);
                    else {
                        this.logger.log("PM2 process started successfully");
                        resolve(proc);
                    }
                });
            });
        });
    }

    /**
     * Delete PM2 process
     * @param appName Optional app name, uses default if not provided
     */
    async delete(appName?: string): Promise<Pm2OperationResult> {
        const targetApp = appName || this.pm2AppName;
        this.logger.log(`Deleting PM2 process: ${targetApp}`);

        return this.executePm2Operation(async () => {
            return new Promise<pm2.Proc>((resolve, reject) => {
                pm2.delete(targetApp, (err, proc) => {
                    if (err) reject(err);
                    else {
                        this.logger.log(`PM2 process deleted successfully: ${targetApp}`);
                        resolve(proc);
                    }
                });
            });
        });
    }

    /**
     * Get PM2 process list
     */
    async list(): Promise<Pm2OperationResult<Pm2ListItem[]>> {
        return this.executePm2Operation(async () => {
            const processList = await this.getProcessList();
            return processList.map((proc) => ({
                pid: proc.pid || 0,
                name: proc.name || "",
                pm_id: proc.pm_id || 0,
                status: proc.pm2_env?.status,
                monit: {
                    cpu: proc.monit?.cpu || 0,
                    memory: proc.monit?.memory || 0,
                },
                restarts: proc.pm2_env?.restart_time || 0,
                uptime: proc.pm2_env?.pm_uptime
                    ? `${Math.floor((Date.now() - proc.pm2_env.pm_uptime) / 1000)}s`
                    : "0s",
            }));
        });
    }

    /**
     * Get specific PM2 process info
     * @param appName Optional app name, uses default if not provided
     */
    async getProcessInfo(appName?: string): Promise<Pm2OperationResult<Pm2ProcessInfo>> {
        const targetApp = appName || this.pm2AppName;

        return this.executePm2Operation(async () => {
            const processList = await this.getProcessList();
            const process = processList.find((p) => p.name === targetApp);

            if (!process) {
                throw new Error(`Process not found: ${targetApp}`);
            }

            return {
                name: process.name || "",
                pid: process.pid || 0,
                status: process.pm2_env?.status,
                cpu: process.monit?.cpu || 0,
                memory: process.monit?.memory || 0,
                uptime: process.pm2_env?.pm_uptime ? Date.now() - process.pm2_env.pm_uptime : 0,
                restarts: process.pm2_env?.restart_time || 0,
            };
        });
    }

    /**
     * Check if PM2 process is running
     * @param appName Optional app name, uses default if not provided
     */
    async isProcessRunning(appName?: string): Promise<boolean> {
        const result = await this.getProcessInfo(appName);
        return result.success && result.data?.status === "online";
    }

    /**
     * Get PM2 logs (returns log file paths)
     * @param lines Number of lines to retrieve (not used with API, kept for compatibility)
     * @param appName Optional app name, uses default if not provided
     */
    async getLogs(appName?: string): Promise<Pm2OperationResult> {
        const targetApp = appName || this.pm2AppName;

        return this.executePm2Operation(async () => {
            return new Promise<pm2.ProcessDescription[]>((resolve, reject) => {
                pm2.describe(targetApp, (err, processDescriptionList) => {
                    if (err) reject(err);
                    else resolve(processDescriptionList);
                });
            }).then((processList) => {
                if (processList.length === 0) {
                    throw new Error(`Process not found: ${targetApp}`);
                }
                const proc = processList[0];
                return {
                    outLogPath: proc.pm2_env?.pm_out_log_path,
                    errLogPath: proc.pm2_env?.pm_err_log_path,
                };
            });
        });
    }

    /**
     * Flush PM2 logs
     */
    async flushLogs(): Promise<Pm2OperationResult> {
        this.logger.log("Flushing PM2 logs");

        return this.executePm2Operation(async () => {
            return new Promise<any>((resolve, reject) => {
                pm2.flush(this.pm2AppName, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
        });
    }

    /**
     * Save PM2 process list
     */
    async save(): Promise<Pm2OperationResult> {
        this.logger.log("Saving PM2 process list");

        return this.executePm2Operation(async () => {
            return new Promise<any>((resolve, reject) => {
                pm2.dump((err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
        });
    }

    /**
     * Get PM2 log rotate configuration from dictionary.
     */
    async getLogRotateConfig(): Promise<Pm2OperationResult<Pm2LogRotateConfig>> {
        try {
            const stored = await this.dictService.get<Partial<Pm2LogRotateConfig>>(
                PM2_LOG_ROTATE_KEY,
                DEFAULT_LOG_ROTATE_CONFIG,
                PM2_LOG_ROTATE_GROUP,
            );

            const config = this.normalizeLogRotateConfig(stored);
            return {
                success: true,
                data: {
                    ...config,
                    moduleInstalled: await this.isLogRotateInstalled(),
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message,
            };
        }
    }

    /**
     * Save and apply PM2 log rotate configuration.
     */
    async setLogRotateConfig(
        dto: Pm2LogRotateConfigDto,
    ): Promise<Pm2OperationResult<Pm2LogRotateApplyResult>> {
        try {
            const config = this.normalizeLogRotateConfig(dto);
            this.validateLogRotateConfig(config);

            if (config.enabled) {
                await this.applyLogRotateConfig(config);
            } else {
                await this.uninstallLogRotateIfInstalled();
            }

            await this.dictService.set(PM2_LOG_ROTATE_KEY, config, {
                group: PM2_LOG_ROTATE_GROUP,
                description: "PM2 日志切割配置",
                sort: 0,
                isEnabled: true,
            });

            await this.runPm2Command(["save"]);
            await this.archiveRotatedLogsByMonth();

            return {
                success: true,
                data: {
                    installed: await this.isLogRotateInstalled(),
                    applied: config.enabled,
                    config,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to set PM2 log rotate config: ${message}`);
            return {
                success: false,
                message,
            };
        }
    }

    /**
     * Apply the current stored PM2 log rotate configuration again.
     */
    async applyStoredLogRotateConfig(): Promise<Pm2OperationResult<Pm2LogRotateApplyResult>> {
        const configResult = await this.getLogRotateConfig();
        if (!configResult.success || !configResult.data) {
            return {
                success: false,
                message: configResult.message || "Failed to get PM2 log rotate config",
            };
        }

        return this.setLogRotateConfig(configResult.data);
    }

    /**
     * Get PM2 log rotate module status.
     */
    async getLogRotateStatus(): Promise<Pm2OperationResult<Pm2LogRotateStatus>> {
        try {
            const configResult = await this.getLogRotateConfig();
            const config = configResult.data || DEFAULT_LOG_ROTATE_CONFIG;
            const installed = await this.isLogRotateInstalled();

            return {
                success: true,
                data: {
                    installed,
                    config,
                    message: installed
                        ? "pm2-logrotate is installed"
                        : "pm2-logrotate is not installed",
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message,
            };
        }
    }

    private async applyLogRotateConfig(config: Pm2LogRotateConfig): Promise<void> {
        await this.installLogRotateIfNeeded();

        const settings: Array<[string, string]> = [
            ["max_size", config.maxSize],
            ["retain", String(config.retain)],
            ["compress", String(config.compress)],
            ["dateFormat", "YYYY-MM-DD_HH-mm-ss"],
            ["rotateInterval", config.rotateInterval],
            ["TZ", config.timezone],
        ];

        for (const [key, value] of settings) {
            await this.runPm2Command(["set", `${PM2_LOG_ROTATE_MODULE}:${key}`, value]);
        }
    }

    /**
     * Get PM2 health status
     */
    async getHealthStatus(): Promise<Pm2OperationResult> {
        if (!this.isPm2Available()) {
            return {
                success: false,
                message: "PM2 is not available",
            };
        }

        const processInfo = await this.getProcessInfo();

        if (!processInfo.success) {
            return {
                success: false,
                message: "Failed to get process information",
            };
        }

        const isHealthy = processInfo.data?.status === "online";

        return {
            success: true,
            data: {
                healthy: isHealthy,
                process: processInfo.data,
            },
        };
    }
}
