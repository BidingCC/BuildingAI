import { CacheModule } from "@buildingai/cache";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities";
import { TerminalLogger } from "@buildingai/logger";
import { Global, Logger, Module, OnModuleInit } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { DictService } from "./services/dict.service";
import { DictCacheService } from "./services/dict-cache.service";

/**
 * Dictionary Configuration Module
 *
 * Global module for managing dictionary configurations with caching support
 */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([Dict]), EventEmitterModule.forRoot(), CacheModule],
    providers: [DictService, DictCacheService],
    exports: [DictService, DictCacheService],
})
export class DictModule implements OnModuleInit {
    private readonly logger = new Logger(DictModule.name);

    constructor(private readonly dictCacheService: DictCacheService) {}

    /**
     * Load all dictionary configurations into cache on module initialization
     */
    async onModuleInit() {
        try {
            // Initialize dictionary cache after database connection is established
            await this.dictCacheService.loadAllDictsToCache();
            TerminalLogger.success("Config Cache", "Dict Cache Init Successful");
            this.logger.log("✅ Dictionary cache initialized successfully");
        } catch (error) {
            // Log warning if initialization fails, but don't block module loading
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Dictionary cache initialization failed: ${message}`);
        }
    }
}
