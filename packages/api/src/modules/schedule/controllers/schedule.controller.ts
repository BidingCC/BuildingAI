import {
    type CronJobInfo,
    type IntervalInfo,
    ScheduleService,
    type TimeoutInfo,
} from "@buildingai/core";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Delete, Get, Param, Post } from "@nestjs/common";

/**
 * Schedule management controller.
 * Provides APIs for viewing and controlling scheduled tasks.
 */
@ConsoleController("schedule", "定时任务")
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) {}

    // ==================== Cron Jobs ====================

    @Get("cron-jobs")
    getCronJobs(): CronJobInfo[] {
        return this.scheduleService.getCronJobs();
    }

    @Get("cron-jobs/:name")
    getCronJob(@Param("name") name: string): CronJobInfo {
        return this.scheduleService.getCronJob(name);
    }

    @Post("cron-jobs/:name/start")
    startCronJob(@Param("name") name: string): void {
        this.scheduleService.startCronJob(name);
    }

    @Post("cron-jobs/:name/stop")
    stopCronJob(@Param("name") name: string): void {
        this.scheduleService.stopCronJob(name);
    }

    @Delete("cron-jobs/:name")
    deleteCronJob(@Param("name") name: string): void {
        this.scheduleService.deleteCronJob(name);
    }

    // ==================== Intervals ====================

    @Get("intervals")
    getIntervals(): IntervalInfo[] {
        return this.scheduleService.getIntervals();
    }

    @Delete("intervals/:name")
    deleteInterval(@Param("name") name: string): void {
        this.scheduleService.deleteInterval(name);
    }

    // ==================== Timeouts ====================

    @Get("timeouts")
    getTimeouts(): TimeoutInfo[] {
        return this.scheduleService.getTimeouts();
    }

    @Delete("timeouts/:name")
    deleteTimeout(@Param("name") name: string): void {
        this.scheduleService.deleteTimeout(name);
    }
}
