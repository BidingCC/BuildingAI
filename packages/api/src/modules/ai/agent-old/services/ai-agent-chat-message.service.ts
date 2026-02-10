import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AgentChatMessage } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AiAgentChatsMessageService extends BaseService<AgentChatMessage> {
    constructor(
        @InjectRepository(AgentChatMessage)
        private readonly messageRepository: Repository<AgentChatMessage>,
        @InjectRepository(AgentChatRecord)
        private readonly chatRecordRepository: Repository<AgentChatRecord>,
    ) {
        super(messageRepository);
    }

    async findMessages(paginationDto: PaginationDto, queryDto?: { conversationId?: string }) {
        const options = {
            relations: ["conversation", "user", "agent"],
            order: { createdAt: "DESC" as const },
            ...(queryDto?.conversationId && {
                where: { conversationId: queryDto.conversationId },
            }),
        };

        return this.paginate(paginationDto, options);
    }

    async getConversationMessages(conversationId: string, paginationDto: PaginationDto) {
        const record = await this.chatRecordRepository.findOne({
            where: { id: conversationId, isDeleted: false },
        });

        if (!record) {
            throw HttpErrorFactory.notFound("对话记录不存在");
        }
        return await this.findMessages(paginationDto, { conversationId });
    }
}
