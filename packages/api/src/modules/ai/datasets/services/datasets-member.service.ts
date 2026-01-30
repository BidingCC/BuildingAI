import { BaseService } from "@buildingai/base";
import { TEAM_ROLE } from "@buildingai/constants/shared/team-role.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetMember } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

/**
 * 知识库成员服务
 *
 * 负责知识库成员（如创建者/所有者）的初始化等操作。
 */
@Injectable()
export class DatasetMemberService extends BaseService<DatasetMember> {
    protected readonly logger = new Logger(DatasetMemberService.name);

    constructor(
        @InjectRepository(DatasetMember)
        private readonly datasetMemberRepository: Repository<DatasetMember>,
    ) {
        super(datasetMemberRepository);
    }

    /**
     * 初始化知识库所有者
     */
    async initializeOwner(datasetId: string, ownerId: string): Promise<DatasetMember> {
        const owner = this.datasetMemberRepository.create({
            datasetId,
            userId: ownerId,
            role: TEAM_ROLE.OWNER,
            isActive: true,
        });
        return this.datasetMemberRepository.save(owner);
    }
}
