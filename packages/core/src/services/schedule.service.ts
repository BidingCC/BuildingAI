import { Injectable, Logger } from "@nestjs/common";

import { SchedulerRegistry } from "../@nestjs/schedule";

export interface CronJobInfo {
    name: string;
    running: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
}

export interface IntervalInfo {
    name: string;
}

export interface TimeoutInfo {
    name: string;
}

/**
 * Schedule service for managing dynamic scheduled tasks.
 * For static tasks, use @Cron/@Interval/@Timeout decorators directly.
 */
@Injectable()
export class ScheduleService {
    private readonly logger = new Logger(ScheduleService.name);

    constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

    // ==================== Cron Jobs ====================

    getCronJobs(): CronJobInfo[] {
        const jobs = this.schedulerRegistry.getCronJobs();
        const result: CronJobInfo[] = [];

        jobs.forEach((job, name) => {
            result.push({
                name,
                running: job.isActive,
                lastRun: job.lastDate(),
                nextRun: job.nextDate()?.toJSDate() ?? null,
            });
        });

        return result;
    }

    getCronJob(name: string): CronJobInfo {
        const job = this.schedulerRegistry.getCronJob(name);

        return {
            name,
            running: job.isActive,
            lastRun: job.lastDate(),
            nextRun: job.nextDate()?.toJSDate() ?? null,
        };
    }

    startCronJob(name: string): void {
        const job = this.schedulerRegistry.getCronJob(name);
        job.start();
        this.logger.log(`Cron job "${name}" started`);
    }

    stopCronJob(name: string): void {
        const job = this.schedulerRegistry.getCronJob(name);
        job.stop();
        this.logger.log(`Cron job "${name}" stopped`);
    }

    deleteCronJob(name: string): void {
        const job = this.schedulerRegistry.getCronJob(name);
        job.stop();
        this.schedulerRegistry.deleteCronJob(name);
        this.logger.log(`Cron job "${name}" deleted`);
    }

    // ==================== Intervals ====================

    getIntervals(): IntervalInfo[] {
        return this.schedulerRegistry.getIntervals().map((name) => ({ name }));
    }

    deleteInterval(name: string): void {
        const interval = this.schedulerRegistry.getInterval(name);
        clearInterval(interval);
        this.schedulerRegistry.deleteInterval(name);
        this.logger.log(`Interval "${name}" deleted`);
    }

    // ==================== Timeouts ====================

    getTimeouts(): TimeoutInfo[] {
        return this.schedulerRegistry.getTimeouts().map((name) => ({ name }));
    }

    deleteTimeout(name: string): void {
        const timeout = this.schedulerRegistry.getTimeout(name);
        clearTimeout(timeout);
        this.schedulerRegistry.deleteTimeout(name);
        this.logger.log(`Timeout "${name}" deleted`);
    }
}
