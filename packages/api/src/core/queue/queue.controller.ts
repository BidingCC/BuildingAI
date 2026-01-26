import { QueueService } from "@buildingai/core/modules";
import { Body, Delete, Get, Param, Post } from "@nestjs/common";

import { ConsoleController } from "../../common/decorators/controller.decorator";

/**
 * 队列控制器
 *
 * 提供任务队列的管理API
 */
@ConsoleController("queue", "任务队列")
export class QueueController {
    constructor(private readonly queueService: QueueService) {}

    /**
     * 获取默认队列的所有任务
     */
    @Get("default/jobs")
    async getDefaultQueueJobs() {
        return this.queueService.getDefaultQueueJobs();
    }

    /**
     * 获取邮件队列的所有任务
     */
    @Get("email/jobs")
    async getEmailQueueJobs() {
        return this.queueService.getEmailQueueJobs();
    }

    /**
     * 获取指定队列的任务详情
     */
    @Get(":queueName/jobs/:jobId")
    async getJobById(@Param("queueName") queueName: string, @Param("jobId") jobId: string) {
        const job = await this.queueService.getJobById(queueName, jobId);

        if (!job) {
            return {
                success: false,
                message: `任务不存在: ${queueName}/${jobId}`,
            };
        }

        return { success: true, data: job };
    }

    /**
     * 添加任务到默认队列
     */
    @Post("default/jobs")
    async addToDefaultQueue(@Body() body: { name: string; data: any; options?: any }) {
        const { name, data, options } = body;
        const job = await this.queueService.addToDefaultQueue(name, data, options);

        return {
            success: true,
            message: `任务已添加到默认队列`,
            jobId: job.id,
        };
    }

    /**
     * 添加任务到邮件队列
     */
    @Post("email/jobs")
    async addToEmailQueue(@Body() body: { name: string; data: any; options?: any }) {
        const { name, data, options } = body;
        const job = await this.queueService.addToEmailQueue(name, data, options);

        return {
            success: true,
            message: `任务已添加到邮件队列`,
            jobId: job.id,
        };
    }

    /**
     * 删除指定队列的任务
     */
    @Delete(":queueName/jobs/:jobId")
    async removeJob(@Param("queueName") queueName: string, @Param("jobId") jobId: string) {
        const result = await this.queueService.removeJob(queueName, jobId);

        if (result) {
            return {
                success: true,
                message: `任务已删除: ${queueName}/${jobId}`,
            };
        } else {
            return {
                success: false,
                message: `任务不存在或删除失败: ${queueName}/${jobId}`,
            };
        }
    }

    /**
     * 重试指定队列的失败任务
     */
    @Post(":queueName/jobs/:jobId/retry")
    async retryJob(@Param("queueName") queueName: string, @Param("jobId") jobId: string) {
        const result = await this.queueService.retryJob(queueName, jobId);

        if (result) {
            return {
                success: true,
                message: `任务已重试: ${queueName}/${jobId}`,
            };
        } else {
            return {
                success: false,
                message: `任务不存在或重试失败: ${queueName}/${jobId}`,
            };
        }
    }
}
