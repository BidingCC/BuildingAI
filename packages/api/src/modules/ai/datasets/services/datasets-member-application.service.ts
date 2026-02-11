import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetMemberApplication } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class DatasetMemberApplicationService extends BaseService<DatasetMemberApplication> {
    protected readonly logger = new Logger(DatasetMemberApplicationService.name);

    constructor(
        @InjectRepository(DatasetMemberApplication)
        repo: Repository<DatasetMemberApplication>,
    ) {
        super(repo);
    }
}
