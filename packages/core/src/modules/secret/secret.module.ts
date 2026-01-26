import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AiProvider } from "@buildingai/db/entities";
import { SecretTemplate } from "@buildingai/db/entities";
import { Secret } from "@buildingai/db/entities";
import { Global, Module } from "@nestjs/common";

import { SecretService } from "./services/secret.service";
import { SecretTemplateService } from "./services/secret-template.service";

/**
 * Secret Module (Global)
 *
 * Provides centralized secret and secret template management functionality.
 * This module is global, so you don't need to import it in every module.
 * Just import it once in your root module (e.g., AppModule).
 *
 * @example
 * ```ts
 * // In your module
 * import { SecretModule } from '@buildingai/core/modules/secret';
 *
 * @Module({
 *   imports: [SecretModule],
 *   // ...
 * })
 * export class YourModule {}
 * ```
 */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([Secret, SecretTemplate, AiProvider])],
    providers: [SecretTemplateService, SecretService],
    exports: [
        SecretTemplateService,
        SecretService,
        TypeOrmModule.forFeature([Secret, SecretTemplate, AiProvider]),
    ],
})
export class SecretModule {}
