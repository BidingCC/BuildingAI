import { BaseService } from "@buildingai/base";
import { BaseController } from "@buildingai/base";
import { LOGIN_TYPE } from "@buildingai/constants";
import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE_DESCRIPTION,
} from "@buildingai/constants/shared/account-log.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AccountLog } from "@buildingai/db/entities/account-log.entity";
import { Agent } from "@buildingai/db/entities/ai-agent.entity";
import { type UserPlayground } from "@buildingai/db/interfaces/context.interface";
import { In, IsNull, Like, Not, Repository } from "@buildingai/db/typeorm";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { WebController } from "@common/decorators/controller.decorator";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { Body, Get, Inject, Patch, Query } from "@nestjs/common";

import { DatasetMemberService } from "../../../ai/datasets/services/datasets-member.service";
import { UserService } from "../../services/user.service";
import { AccountLogDto } from "./../../dto/account-log-dto";
import { ALLOWED_USER_FIELDS, UpdateUserFieldDto } from "./../../dto/update-user-field.dto";

/**
 * 前台用户控制器
 *
 * 处理前台用户信息管理相关功能
 */
@WebController("user")
export class UserWebController extends BaseController {
    private readonly accountLogService: BaseService<AccountLog>;

    /**
     * 构造函数
     *
     * @param userService 用户服务
     * @param rolePermissionService 角色权限服务
     * @param datasetMemberService 知识库成员服务
     * @param dictService 字典服务
     */
    constructor(
        private readonly userService: UserService,
        @Inject(RolePermissionService)
        private readonly rolePermissionService: RolePermissionService,
        private readonly datasetMemberService: DatasetMemberService,
        private readonly dictService: DictService,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(AccountLog)
        private readonly accountLogRepository: Repository<AccountLog>,
    ) {
        super();
        this.accountLogService = new BaseService(accountLogRepository);
    }

    /**
     * 获取当前用户信息
     *
     * @param user 当前登录用户
     * @returns 用户信息
     */
    @Get("info")
    @BuildFileUrl(["**.avatar"])
    async getUserInfo(@Playground() user: UserPlayground) {
        // 获取用户信息（排除敏感字段）
        const userInfo = await this.userService.findOneById(user.id, {
            excludeFields: ["password"],
            relations: ["role"],
        });

        if (!userInfo) {
            throw HttpErrorFactory.notFound("用户不存在");
        }

        // 获取用户的所有权限码
        const permissionCodes = await this.rolePermissionService.getUserPermissions(user.id);

        // 判断用户是否有权限：有权限就是1，没有权限就是0
        const hasPermissions = user.isRoot === 1 || permissionCodes.length > 0 ? 1 : 0;
        const { openid, ...restUserInfo } = userInfo;
        return {
            ...restUserInfo,
            bindWechat: !!openid,
            permissions: hasPermissions,
        };
    }

    /**
     * 搜索用户列表
     *
     * @param keyword 搜索关键词（支持搜索用户名、昵称、邮箱、手机号）
     * @param limit 返回数量限制
     * @param datasetId 知识库ID，用于排除已存在的成员
     * @returns 用户列表（只返回有角色的用户，排除已存在于知识库的成员）
     */
    @Get("search")
    @BuildFileUrl(["**.avatar"])
    async searchUsers(
        @Playground() user: UserPlayground,
        @Query("keyword") keyword?: string,
        @Query("limit") limit?: number,
        @Query("datasetId") datasetId?: string,
    ) {
        const searchLimit = Math.min(limit || 20, 50); // 限制最大返回50条

        // 获取已存在于知识库中的成员用户ID列表
        let excludeUserIds: string[] = [];
        if (datasetId) {
            const existingMembers = await this.datasetMemberService.findAll({
                where: { datasetId, isActive: true },
                select: ["userId"],
            });
            excludeUserIds = existingMembers.map((member) => member.userId);
        }

        // 构建基础查询条件
        const baseCondition: any = {
            status: 1,
            role: Not(IsNull()),
        };

        // 构建排除用户ID的条件
        const excludeIds = [user.id, ...excludeUserIds];
        if (excludeIds.length > 0) {
            baseCondition.id = Not(In(excludeIds));
        }

        // 查询用户列表 - 只返回有角色的用户，排除已存在于知识库的成员
        const users = await this.userService.findAll({
            where: keyword
                ? [
                      {
                          username: Like(`%${keyword}%`),
                          ...baseCondition,
                      },
                      {
                          nickname: Like(`%${keyword}%`),
                          ...baseCondition,
                      },
                      {
                          email: Like(`%${keyword}%`),
                          ...baseCondition,
                      },
                      {
                          phone: Like(`%${keyword}%`),
                          ...baseCondition,
                      },
                  ]
                : baseCondition,
            take: searchLimit,
            order: { createdAt: "DESC" },
            excludeFields: ["password", "phone", "phoneAreaCode", "permissions"],
            relations: ["role"],
        });

        return users;
    }

    /**
     * 修改用户信息（单个字段）
     *
     * @param updateUserFieldDto 更新用户字段DTO
     * @param currentUser 当前登录用户
     * @returns 更新后的用户信息
     */
    @Patch("update-field")
    @BuildFileUrl(["**.avatar"])
    async updateUserField(
        @Body() updateUserFieldDto: UpdateUserFieldDto,
        @Playground() currentUser: UserPlayground,
    ) {
        const { field, value } = updateUserFieldDto;
        let newValue = value;

        // 检查用户是否存在
        const user = await this.userService.findOneById(currentUser.id);
        if (!user) {
            throw HttpErrorFactory.notFound("用户不存在");
        }

        // 验证字段是否允许更新
        if (!ALLOWED_USER_FIELDS.includes(field)) {
            throw HttpErrorFactory.badRequest(`不允许更新字段: ${field}`);
        }

        // 特殊字段验证
        if (field === "email" && newValue) {
            // 检查邮箱是否已被其他用户使用
            const existingUser = await this.userService.findOne({
                where: { email: newValue },
            });
            if (existingUser && existingUser.id !== currentUser.id) {
                throw HttpErrorFactory.badRequest("该邮箱已被其他用户使用");
            }
        }

        if (field === "phone" && newValue) {
            // 检查手机号是否已被其他用户使用
            const existingUser = await this.userService.findOne({
                where: { phone: newValue },
            });
            if (existingUser && existingUser.id !== currentUser.id) {
                throw HttpErrorFactory.badRequest("该手机号已被其他用户使用");
            }
        }

        // 构建更新数据
        const updateData: Record<string, any> = {};
        updateData[field] = newValue;

        // 更新用户信息
        const updatedUser = await this.userService.updateUserById(currentUser.id, updateData, {
            excludeFields: ["password"],
        });

        return {
            user: updatedUser,
            message: `更新成功`,
        };
    }

    /**
     * 账户记录
     * @param accountLogDto
     * @param user
     * @returns
     */
    @Get("account-log")
    async accountLog(@Query() accountLogDto: AccountLogDto, @Playground() user: UserPlayground) {
        const { action } = accountLogDto;

        // 构建查询条件
        const where: any = { userId: user.id };
        if (action !== undefined && action !== "") {
            where.action = action;
        }

        // 获取用户信息
        const userInfo = await this.userService.findOne({
            where: { id: user.id },
            select: ["power"],
        });

        // 使用 paginate 方法进行分页查询
        const lists = await this.accountLogService.paginate(accountLogDto, {
            where,
            order: {
                createdAt: "DESC",
                accountType: "DESC",
            },
        });

        // 处理返回结果
        const agentIds = new Set<string>();

        // 先收集所有需要查询的智能体ID
        lists.items.forEach((accountLog) => {
            if (
                accountLog.sourceInfo?.type === ACCOUNT_LOG_SOURCE.AGENT_CHAT &&
                accountLog.sourceInfo?.source
            ) {
                agentIds.add(accountLog.sourceInfo.source);
            }
        });

        // 如果有智能体ID，先批量查询
        const agentMap = new Map<string, string>();
        if (agentIds.size > 0) {
            const agentIdArray = Array.from(agentIds);
            try {
                // 批量查询智能体信息
                const agents = await this.agentRepository.find({
                    where: { id: In(agentIdArray) },
                    select: ["id", "name"],
                });

                // 构建ID到名称的映射
                agents.forEach((agent) => {
                    agentMap.set(agent.id, agent.name);
                });
            } catch (error) {
                this.logger.error(`查询智能体信息失败: ${error.message}`);
            }
        }

        // 处理每条记录
        lists.items = lists.items.map((accountLog) => {
            const accountTypeDesc = ACCOUNT_LOG_TYPE_DESCRIPTION[accountLog.accountType];
            let consumeSourceDesc = "";

            // 根据来源类型处理
            if (accountLog.sourceInfo) {
                switch (accountLog.sourceInfo.type) {
                    case ACCOUNT_LOG_SOURCE.AGENT_CHAT:
                        // 如果是智能体对话，使用智能体名称
                        if (agentMap.has(accountLog.sourceInfo.source)) {
                            consumeSourceDesc = agentMap.get(accountLog.sourceInfo.source);
                        } else {
                            consumeSourceDesc = `智能体(${accountLog.sourceInfo.source})`;
                        }
                        break;

                    default:
                        consumeSourceDesc = accountLog.sourceInfo.source;
                }
            }

            return { ...accountLog, accountTypeDesc, consumeSourceDesc };
        });

        return { ...lists, userInfo };
    }

    /**
     * 获取登录设置
     *
     * @returns 当前的登录设置配置
     */
    @Public()
    @Get("login-settings")
    async getLoginSettings() {
        // 从字典服务获取登录设置配置
        const config = await this.dictService.get(
            "login_settings",
            this.getDefaultLoginSettings(),
            "auth",
        );

        return config;
    }

    /**
     * 获取默认登录设置
     *
     * @returns 默认的登录设置配置
     */
    private getDefaultLoginSettings() {
        return {
            allowedLoginMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.WECHAT],
            allowedRegisterMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.WECHAT],
            defaultLoginMethod: LOGIN_TYPE.ACCOUNT,
            allowMultipleLogin: false,
            showPolicyAgreement: true,
        };
    }
}
