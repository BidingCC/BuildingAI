import { ScheduleService } from "@buildingai/core";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Body, Delete, Get, Param, Post } from "@nestjs/common";

/**
 * 定时任务控制器
 *
 * 提供定时任务的管理API
 */
@ConsoleController("schedule", "定时任务")
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) {}

    /**
     * 获取所有Cron任务
     */
    @Get("cron-jobs")
    getCronJobs() {
        return this.scheduleService.getCronJobs();
    }

    /**
     * 获取所有间隔任务
     */
    @Get("intervals")
    getIntervals() {
        return this.scheduleService.getIntervals();
    }

    /**
     * 获取所有一次性任务
     */
    @Get("timeouts")
    getTimeouts() {
        return this.scheduleService.getTimeouts();
    }

    /**
     * 创建Cron任务
     */
    @Post("cron-jobs")
    createCronJob(@Body() body: { name: string; cronTime: string }) {
        const { name, cronTime } = body;

        this.scheduleService.addCronJob(name, cronTime, () => {
            console.log(`执行动态创建的Cron任务: ${name}`);
        });

        return { success: true, message: `Cron任务 ${name} 已创建` };
    }

    /**
     * 创建间隔任务
     */
    @Post("intervals")
    createInterval(@Body() body: { name: string; milliseconds: number }) {
        const { name, milliseconds } = body;

        this.scheduleService.addIntervalJob(name, milliseconds, () => {
            console.log(`执行动态创建的间隔任务: ${name}`);
        });

        return { success: true, message: `间隔任务 ${name} 已创建` };
    }

    /**
     * 创建一次性任务
     */
    @Post("timeouts")
    createTimeout(@Body() body: { name: string; milliseconds: number }) {
        const { name, milliseconds } = body;

        this.scheduleService.addTimeoutJob(name, milliseconds, () => {
            console.log(`执行动态创建的一次性任务: ${name}`);
        });

        return { success: true, message: `一次性任务 ${name} 已创建` };
    }

    /**
     * 删除Cron任务
     */
    @Delete("cron-jobs/:name")
    deleteCronJob(@Param("name") name: string) {
        const result = this.scheduleService.deleteCronJob(name);

        if (result) {
            return { success: true, message: `Cron任务 ${name} 已删除` };
        } else {
            return { success: false, message: `Cron任务 ${name} 删除失败` };
        }
    }

    /**
     * 删除间隔任务
     */
    @Delete("intervals/:name")
    deleteInterval(@Param("name") name: string) {
        const result = this.scheduleService.deleteInterval(name);

        if (result) {
            return { success: true, message: `间隔任务 ${name} 已删除` };
        } else {
            return { success: false, message: `间隔任务 ${name} 删除失败` };
        }
    }

    /**
     * 删除一次性任务
     */
    @Delete("timeouts/:name")
    deleteTimeout(@Param("name") name: string) {
        const result = this.scheduleService.deleteTimeout(name);

        if (result) {
            return { success: true, message: `一次性任务 ${name} 已删除` };
        } else {
            return { success: false, message: `一次性任务 ${name} 删除失败` };
        }
    }
}
