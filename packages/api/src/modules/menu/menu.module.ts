import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Menu } from "@buildingai/db/entities";
import { Permission } from "@buildingai/db/entities";
import { Role } from "@buildingai/db/entities";
import { MenuConsoleController } from "@modules/menu/controllers/console/menu.controller";
import { MenuService } from "@modules/menu/services/menu.service";
import { Module } from "@nestjs/common";

/**
 * 菜单模块
 */
@Module({
    imports: [TypeOrmModule.forFeature([Menu, Permission, User, Role])],
    controllers: [MenuConsoleController],
    providers: [MenuService],
    exports: [MenuService],
})
export class MenuModule {}
