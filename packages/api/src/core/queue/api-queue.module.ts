import { QueueModule } from "@buildingai/core/modules";
import { Module } from "@nestjs/common";

import { DefaultProcessor } from "./processors/default.processor";
import { EmailProcessor } from "./processors/email.processor";
import { QueueController } from "./queue.controller";

/**
 * API Queue module
 *
 * Extends core QueueModule with business-specific processors
 * Registers all business queue processors and their dependencies
 */
@Module({
    imports: [QueueModule],
    controllers: [QueueController],
    providers: [DefaultProcessor, EmailProcessor],
    exports: [QueueModule],
})
export class ApiQueueModule {}
