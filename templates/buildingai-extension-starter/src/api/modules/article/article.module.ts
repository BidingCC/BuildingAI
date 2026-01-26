import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User, UserSubscription } from "@buildingai/db/entities";
import { PublicUserService } from "@buildingai/extension-sdk";
import { Module } from "@nestjs/common";

import { Article } from "../../db/entities/article.entity";
import { CategoryModule } from "../category/category.module";
import { ArticleController } from "./controllers/console/article.controller";
import { ArticleWebController } from "./controllers/web/article.web.controller";
import { ArticleService } from "./services/article.service";

@Module({
    imports: [TypeOrmModule.forFeature([Article, User, UserSubscription]), CategoryModule],
    controllers: [ArticleController, ArticleWebController],
    providers: [ArticleService, PublicUserService],
    exports: [ArticleService],
})
export class ArticleModule {}
