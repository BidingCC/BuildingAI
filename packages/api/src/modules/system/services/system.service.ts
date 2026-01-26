import { AppConfig } from "@buildingai/config/app.config";
import { BooleanNumber, UserCreateSource, UserTerminal } from "@buildingai/constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { generateNo } from "@buildingai/utils";
import { SYSTEM_CONFIG } from "@common/constants";
import { AuthService } from "@common/modules/auth/services/auth.service";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { UserService } from "@modules/user/services/user.service";
import { Injectable, Logger } from "@nestjs/common";
import { exec } from "child_process";
import { machineIdSync } from "node-machine-id";
import { promisify } from "util";

import { initializeDto } from "../dto/system.dto";

/**
 * 系统服务
 *
 * 提供系统级操作，如重启应用
 */
@Injectable()
export class SystemService {
    private readonly logger = new Logger(SystemService.name);
    private static isRestarting = false;

    constructor(
        private readonly dictService: DictService,
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly rolePermissionService: RolePermissionService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async getSystemInfo() {
        const isInitialized = await this.dictService.get<boolean>(
            "isInitialized",
            false,
            SYSTEM_CONFIG,
        );
        return {
            isInitialized,
            version: AppConfig.version,
        };
    }

    /**
     * 获取运行时系统信息（用于控制台展示）
     */
    async getRuntimeInfo(): Promise<{ version: string; systemId: string }> {
        const systemId = await machineIdSync(true);
        return {
            version: AppConfig.version,
            systemId,
        };
    }

    /**
     * 初始化系统
     *
     * 创建超级管理员账户、设置网站基本信息并自动登录
     *
     * @param dto 初始化数据
     * @param ipAddress 客户端IP地址
     * @param userAgent 客户端User-Agent
     * @returns 初始化结果(包含登录令牌)
     */
    async initialize(dto: initializeDto, ipAddress?: string, userAgent?: string) {
        try {
            const hashedPassword = await this.userService.hashPassword(dto.password);

            // 创建超级管理员账户
            const user = await this.userService.create({
                username: dto.username,
                password: hashedPassword,
                isRoot: BooleanNumber.YES,
                nickname: dto.nickname || "超级管理员",
                email: dto.email || "",
                status: BooleanNumber.YES,
                userNo: await generateNo(this.userRepository, "userNo"),
                avatar: dto.avatar || `/static/avatars/${Math.floor(Math.random() * 36) + 1}.png`,
                source: UserCreateSource.CONSOLE,
                phone: dto.phone || "",
                power: 0,
            });

            if (dto.websiteName) {
                await this.dictService.set("name", dto.websiteName, { group: "webinfo" });
            }
            if (dto.websiteDescription) {
                await this.dictService.set("description", dto.websiteDescription, {
                    group: "webinfo",
                });
            }
            if (dto.websiteLogo) {
                await this.dictService.set("logo", dto.websiteLogo, {
                    group: "webinfo",
                    normalizeFileUrlFields: ["**"],
                });
            }
            if (dto.websiteIcon) {
                await this.dictService.set("icon", dto.websiteIcon, {
                    group: "webinfo",
                    normalizeFileUrlFields: ["**"],
                });
            }

            // 标记系统已初始化
            await this.dictService.set("isInitialized", true, {
                group: SYSTEM_CONFIG,
            });

            // 自动登录:获取用户角色和权限信息
            const role = await this.rolePermissionService.getUserRoles(user.id);
            const permissions = await this.rolePermissionService.getUserPermissions(user.id);

            // 生成登录令牌
            const tokenResult = await this.authService.userTokenService.createToken(
                user.id,
                {
                    id: user.id,
                    username: user.username,
                    isRoot: user.isRoot,
                    terminal: UserTerminal.PC,
                },
                UserTerminal.PC,
                ipAddress,
                userAgent,
            );

            // 更新用户最后登录时间
            await this.userService.updateById(user.id, {
                lastLoginAt: new Date(),
            });

            const { password: _, ...userInfo } = user;

            return {
                isInitialized: true,
                token: tokenResult.token,
                expiresAt: tokenResult.expiresAt,
                user: {
                    ...userInfo,
                    role,
                    permissions,
                },
            };
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.message, error.data);
        }
    }

    /**
     * 重启应用
     *
     * 通过PM2或直接退出进程的方式重启应用
     * 在PM2环境下使用PM2命令重启应用，否则通过进程退出方式重启
     */
    async restartApplication() {
        try {
            // 防止重复重启
            if (SystemService.isRestarting) {
                this.logger.warn("应用正在重启中，请勿重复操作");
                return {
                    success: false,
                    message: "应用正在重启中，请勿重复操作",
                };
            }

            // 设置重启状态
            SystemService.isRestarting = true;

            // 获取当前使用的端口
            const port = parseInt(process.env.SERVER_PORT || "4090", 10);
            this.logger.log(`正在重启应用，当前端口: ${port}...`);

            // 检查是否使用PM2运行
            const isPm2 = await this.checkIfRunningWithPm2();
            // 直接使用固定的应用名称，与 PM2 中注册的名称一致
            const pm2AppName = process.env.PM2_APP_NAME || "buildingai-api";

            // 延迟执行重启，确保响应能够返回
            setTimeout(async () => {
                try {
                    if (isPm2) {
                        this.logger.log(`检测到PM2环境，通过PM2命令重启应用 ${pm2AppName}...`);
                        const execPromise = promisify(exec);

                        // 使用PM2命令重启应用
                        await execPromise(`pm2 restart ${pm2AppName}`).catch((err) => {
                            this.logger.warn(
                                `PM2重启命令失败: ${err.message}，尝试使用进程退出方式重启`,
                            );
                            process.exit(0); // 如果PM2命令失败，回退到进程退出方式
                        });

                        this.logger.log(`PM2重启命令已执行，应用 ${pm2AppName} 正在重启...`);
                    } else {
                        this.logger.log("未检测到PM2环境，通过进程退出方式重启...");
                        process.exit(0); // 非PM2环境下直接退出进程
                    }
                } catch (error) {
                    this.logger.error(`重启过程中发生错误: ${error.message}`);
                    SystemService.isRestarting = false;
                    return process.exit(1); // 出错时强制退出
                }
            }, 1000);

            return {
                success: true,
                message: "应用重启指令已发送，服务即将重启",
            };
        } catch (error) {
            SystemService.isRestarting = false;
            this.logger.error(`重启应用失败: ${error.message}`);
            throw new Error(`重启应用失败: ${error.message}`);
        }
    }

    /**
     * 检查是否使用PM2运行
     *
     * 通过检查环境变量判断是否在PM2环境中运行
     */
    private async checkIfRunningWithPm2(): Promise<boolean> {
        // 方法1: 检查PM2环境变量
        if (process.env.PM2_HOME || process.env.PM2_JSON_PROCESSING || process.env.PM2_CLI) {
            return true;
        }

        // 方法2: 检查进程名称
        try {
            const execPromise = promisify(exec);
            const { stdout } = await execPromise(
                "pm2 list | grep $(echo $npm_package_name || echo 'buildingai')",
            );
            return !!stdout.trim();
        } catch {
            // 如果执行失败，可能是PM2未安装或未运行该应用
            return false;
        }
    }
}
