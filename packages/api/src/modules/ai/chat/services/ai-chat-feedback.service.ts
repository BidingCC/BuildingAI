import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiChatFeedback } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { CreateFeedbackDto, UpdateFeedbackDto } from "../dto/ai-chat-feedback.dto";

@Injectable()
export class AiChatFeedbackService extends BaseService<AiChatFeedback> {
    constructor(
        @InjectRepository(AiChatFeedback)
        private readonly feedbackRepository: Repository<AiChatFeedback>,
    ) {
        super(feedbackRepository);
    }

    private async calculateConfidenceScore(
        userId: string,
        messageId: string,
        type: "like" | "dislike",
        existingFeedback?: AiChatFeedback,
    ): Promise<number> {
        let score = 0.5;

        if (existingFeedback && existingFeedback.type === type) {
            score -= 0.3;
        }

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentFeedbacks = await this.feedbackRepository
            .createQueryBuilder("feedback")
            .innerJoin("feedback.message", "message")
            .where("feedback.userId = :userId", { userId })
            .andWhere("feedback.type = :type", { type: "dislike" })
            .andWhere("feedback.id != :currentId", {
                currentId: existingFeedback?.id || "00000000-0000-0000-0000-000000000000",
            })
            .andWhere("feedback.createdAt > :oneHourAgo", { oneHourAgo })
            .orderBy("feedback.createdAt", "DESC")
            .limit(5)
            .getMany();

        if (type === "dislike" && recentFeedbacks.length >= 3) {
            score += 0.2;
        }

        if (existingFeedback) {
            const timeDiff = Date.now() - existingFeedback.updatedAt.getTime();
            if (timeDiff < 60000) {
                score -= 0.2;
            }
        }

        return Math.max(0, Math.min(1, score));
    }

    async createOrUpdateFeedback(
        userId: string,
        messageId: string,
        dto: CreateFeedbackDto | UpdateFeedbackDto,
    ): Promise<AiChatFeedback> {
        const existing = await this.feedbackRepository.findOne({
            where: { messageId, userId },
        });

        const confidenceScore = await this.calculateConfidenceScore(
            userId,
            messageId,
            dto.type,
            existing || undefined,
        );

        if (existing) {
            if (existing.type === dto.type) {
                await this.delete(existing.id);
                return existing;
            }
            return this.updateById(existing.id, {
                type: dto.type,
                dislikeReason: dto.type === "dislike" ? dto.dislikeReason : null,
                confidenceScore,
            }) as Promise<AiChatFeedback>;
        }

        return this.create({
            messageId,
            userId,
            type: dto.type,
            dislikeReason: dto.type === "dislike" ? dto.dislikeReason : null,
            confidenceScore,
        }) as Promise<AiChatFeedback>;
    }

    async getFeedbackByMessage(messageId: string, userId: string): Promise<AiChatFeedback | null> {
        return this.feedbackRepository.findOne({
            where: { messageId, userId },
        });
    }

    async getFeedbacksByConversation(
        conversationId: string,
        userId: string,
    ): Promise<AiChatFeedback[]> {
        return this.feedbackRepository
            .createQueryBuilder("feedback")
            .innerJoin("feedback.message", "message")
            .where("message.conversationId = :conversationId", { conversationId })
            .andWhere("feedback.userId = :userId", { userId })
            .getMany();
    }
}
