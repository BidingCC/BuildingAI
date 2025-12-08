import { StorageConfig } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class StorageService {
    @InjectRepository(StorageConfig)
    private repository: Repository<StorageConfig>;

    async getAllConfigs() {
        const configs = await this.repository.find();
        console.log("所有配置:", configs);
        return configs;
    }
}
