import { JobType } from "@buildingai/core/modules";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

/**
 * 邮件队列处理器（BullMQ版）
 */
@Processor("email")
export class EmailProcessor extends WorkerHost {
    private readonly logger = new Logger(EmailProcessor.name);

    /**
     * BullMQ 的核心执行函数
     */
    async process(job: Job): Promise<any> {
        this.logger.log(`➡️  开始邮件任务: ${job.name} (ID: ${job.id})`);
        this.logger.debug(`任务数据: ${JSON.stringify(job.data)}`);

        try {
            switch (job.name) {
                case JobType.EMAIL_SEND:
                    return await this.handleSendEmail(job);
                case "bulk": // 临时保持兼容性，后续改为 JobType.BULK_EMAIL
                    return await this.handleBulkEmail(job);
                default:
                    this.logger.warn(`⚠️ 未知邮件任务类型: ${job.name}`);
                    return { success: false, reason: "Unknown email job type" };
            }
        } catch (error) {
            this.logger.error(`❌ 邮件任务处理失败: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async handleSendEmail(job: Job<any>) {
        this.logger.log(`开始处理邮件发送任务: ${job.id}`);
        this.logger.debug(`任务数据: ${JSON.stringify(job.data)}`);

        try {
            const { to, subject, content, attachments } = job.data;

            // 更新任务进度
            await job.updateProgress(10);

            // 验证邮件参数
            this.validateEmailParams(to, subject, content);

            // 更新任务进度
            await job.updateProgress(30);

            // 模拟邮件发送
            await this.simulateSendEmail(to, subject, content, attachments);

            // 更新任务进度
            await job.updateProgress(100);

            this.logger.log(`邮件发送任务处理完成: ${job.id}`);
            return {
                success: true,
                to,
                subject,
                sentAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`处理邮件发送任务失败: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * 处理批量邮件发送任务
     * @param job 任务对象
     */
    private async handleBulkEmail(job: Job<any>) {
        this.logger.log(`开始处理批量邮件发送任务: ${job.id}`);
        this.logger.debug(`任务数据: ${JSON.stringify(job.data)}`);

        try {
            const { recipients, subject, template, data } = job.data;
            const totalRecipients = recipients?.length || 0;

            if (!totalRecipients) {
                throw new Error("收件人列表为空");
            }

            // 模拟分批发送邮件
            let successCount = 0;
            let failedCount = 0;
            const failedRecipients = [];

            for (let i = 0; i < totalRecipients; i++) {
                // 更新任务进度
                await job.updateProgress(Math.floor((i / totalRecipients) * 100));

                try {
                    // 模拟处理每个收件人
                    const recipient = recipients[i];
                    const content = this.renderTemplate(template, {
                        ...data,
                        recipient,
                    });

                    await this.simulateSendEmail(recipient.email, subject, content);
                    successCount++;

                    this.logger.debug(
                        `已发送邮件给 ${recipient.email} (${i + 1}/${totalRecipients})`,
                    );
                } catch (error) {
                    failedCount++;
                    failedRecipients.push({
                        email: recipients[i].email,
                        reason: error.message,
                    });
                    this.logger.warn(`发送邮件给 ${recipients[i].email} 失败: ${error.message}`);
                }

                // 模拟处理间隔
                await this.simulateProcessing(50);
            }

            // 完成任务
            await job.updateProgress(100);

            this.logger.log(`批量邮件发送任务处理完成: ${job.id}`);
            return {
                success: true,
                totalRecipients,
                successCount,
                failedCount,
                failedRecipients,
                completedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`处理批量邮件发送任务失败: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * 验证邮件参数
     * @param to 收件人
     * @param subject 主题
     * @param content 内容
     */
    private validateEmailParams(to: string, subject: string, content: string): void {
        if (!to) {
            throw new Error("收件人不能为空");
        }

        if (!subject) {
            throw new Error("邮件主题不能为空");
        }

        if (!content) {
            throw new Error("邮件内容不能为空");
        }

        // 简单的邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            throw new Error(`无效的邮箱地址: ${to}`);
        }
    }

    /**
     * 模拟邮件发送
     * @param to 收件人
     * @param subject 主题
     * @param content 内容
     * @param attachments 附件
     */
    private async simulateSendEmail(
        to: string,
        subject: string,
        content: string,
        attachments?: any[],
    ): Promise<void> {
        // 模拟邮件发送延迟
        await this.simulateProcessing(500);

        // 在实际应用中，这里会调用真实的邮件发送服务
        this.logger.debug(`模拟发送邮件: 
            收件人: ${to}
            主题: ${subject}
            附件数量: ${attachments?.length || 0}
        `);
    }

    /**
     * 渲染邮件模板
     * @param template 模板
     * @param data 数据
     */
    private renderTemplate(template: string, data: any): string {
        // 简单的模板渲染实现
        let result = template;

        // 替换模板变量
        Object.keys(data).forEach((key) => {
            const value = typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key];
            result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
        });

        return result;
    }

    /**
     * 模拟处理延迟
     * @param ms 延迟时间（毫秒）
     */
    private async simulateProcessing(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * 可选：监听 Worker 事件（如完成、失败等）
     */
    @OnWorkerEvent("completed")
    onCompleted(job: Job) {
        this.logger.log(`🎉 邮件任务完成: ${job.name} (${job.id})`);
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job, err: Error) {
        this.logger.error(`💥 邮件任务失败: ${job.name} (${job.id}) -> ${err.message}`);
    }
}
