import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DecoratePageEntity } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";
/**
 * 装修页面服务
 */
@Injectable()
export class PageService extends BaseService<DecoratePageEntity> {
    constructor(
        @InjectRepository(DecoratePageEntity)
        private readonly pageRepository: Repository<DecoratePageEntity>,
    ) {
        super(pageRepository);
    }
}
