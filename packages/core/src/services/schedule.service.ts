import { Injectable, Logger } from "@nestjs/common";
import { CronJob } from "cron";

import { SchedulerRegistry } from "../@nestjs/schedule";
// import { Cron, CronExpression, Interval, SchedulerRegistry, Timeout } from "../@nestjs/schedule";

/**
 * 定时任务服务
 *
 * 提供基础的定时任务功能，包括：
 * 1. 声明式任务（通过装饰器定义）
 * 2. 动态任务（通过代码动态创建和管理）
 */
@Injectable()
export class ScheduleService {
    private readonly logger = new Logger(ScheduleService.name);

    constructor(private schedulerRegistry: SchedulerRegistry) {}

    /**
     * 示例：每10秒执行一次的定时任务
     * 使用 @Cron 装饰器，支持 cron 表达式
     */
    // @Cron(CronExpression.EVERY_10_SECONDS)
    // handleCronJob() {
    //     this.logger.debug("每10秒执行一次的定时任务");
    // }

    /**
     * 示例：每5秒执行一次的定时任务
     * 使用 @Interval 装饰器，指定间隔时间（毫秒）
     */
    // @Interval(5000)
    // handleIntervalJob() {
    //     this.logger.debug("每5秒执行一次的定时任务");
    // }

    /**
     * 示例：应用启动后延迟3秒执行的一次性任务
     * 使用 @Timeout 装饰器，指定延迟时间（毫秒）
     */
    // @Timeout(3000)
    // handleTimeoutJob() {
    //     this.logger.debug("应用启动后延迟3秒执行的一次性任务");
    // }

    /**
     * 动态创建一个 Cron 任务
     * @param name 任务名称
     * @param cronTime cron 表达式
     * @param callback 任务回调函数
     */
    addCronJob(name: string, cronTime: string, callback: () => void) {
        const job = new CronJob(cronTime, callback);

        this.schedulerRegistry.addCronJob(name, job);
        job.start();

        this.logger.log(`任务 ${name} 已添加，cron 表达式: ${cronTime}`);

        return job;
    }

    /**
     * 动态创建一个间隔任务
     * @param name 任务名称
     * @param milliseconds 间隔时间（毫秒）
     * @param callback 任务回调函数
     */
    addIntervalJob(name: string, milliseconds: number, callback: () => void) {
        const interval = setInterval(callback, milliseconds);

        this.schedulerRegistry.addInterval(name, interval);

        this.logger.log(`任务 ${name} 已添加，间隔: ${milliseconds}ms`);

        return interval;
    }

    /**
     * 动态创建一个一次性任务
     * @param name 任务名称
     * @param milliseconds 延迟时间（毫秒）
     * @param callback 任务回调函数
     */
    addTimeoutJob(name: string, milliseconds: number, callback: () => void) {
        const timeout = setTimeout(callback, milliseconds);

        this.schedulerRegistry.addTimeout(name, timeout);

        this.logger.log(`任务 ${name} 已添加，延迟: ${milliseconds}ms`);

        return timeout;
    }

    /**
     * 获取所有 Cron 任务
     */
    getCronJobs() {
        const jobs = this.schedulerRegistry.getCronJobs();
        const jobNames = [];

        jobs.forEach((job, name) => {
            const nextDate = job.nextDate();
            // 使用类型断言解决类型问题
            jobNames.push({
                name,
                nextRun: nextDate,
                // 仅返回必要的信息，避免使用可能不存在的属性
                running: true, // 默认认为任务在运行
            });
        });

        return jobNames;
    }

    /**
     * 获取所有间隔任务
     */
    getIntervals() {
        const intervals = this.schedulerRegistry.getIntervals();
        return intervals;
    }

    /**
     * 获取所有一次性任务
     */
    getTimeouts() {
        const timeouts = this.schedulerRegistry.getTimeouts();
        return timeouts;
    }

    /**
     * 删除 Cron 任务
     * @param name 任务名称
     */
    deleteCronJob(name: string) {
        try {
            this.schedulerRegistry.getCronJob(name).stop();
            this.schedulerRegistry.deleteCronJob(name);
            this.logger.log(`任务 ${name} 已删除`);
            return true;
        } catch (error) {
            this.logger.error(`删除任务 ${name} 失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 删除间隔任务
     * @param name 任务名称
     */
    deleteInterval(name: string) {
        try {
            clearInterval(this.schedulerRegistry.getInterval(name));
            this.schedulerRegistry.deleteInterval(name);
            this.logger.log(`间隔任务 ${name} 已删除`);
            return true;
        } catch (error) {
            this.logger.error(`删除间隔任务 ${name} 失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 删除一次性任务
     * @param name 任务名称
     */
    deleteTimeout(name: string) {
        try {
            clearTimeout(this.schedulerRegistry.getTimeout(name));
            this.schedulerRegistry.deleteTimeout(name);
            this.logger.log(`一次性任务 ${name} 已删除`);
            return true;
        } catch (error) {
            this.logger.error(`删除一次性任务 ${name} 失败: ${error.message}`);
            return false;
        }
    }
}
