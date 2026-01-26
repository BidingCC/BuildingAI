import nicknameData from "@assets/nickname.json";
import { BaseService } from "@buildingai/base";
import { type BooleanNumberType, UserCreateSource } from "@buildingai/constants";
import { BusinessCode } from "@buildingai/constants";
import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
    ACTION,
} from "@buildingai/constants/shared/account-log.constants";
import { AppBillingService } from "@buildingai/core/modules";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { MembershipLevels, User, UserSubscription } from "@buildingai/db/entities";
import { Role } from "@buildingai/db/entities";
import { Between, DeepPartial, In, Like, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { generateNo } from "@buildingai/utils";
import { isEnabled } from "@buildingai/utils";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { Inject, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import { BatchUpdateUserDto } from "../dto/batch-update-user.dto";
import { CreateUserDto } from "../dto/create-user.dto";
import { QueryUserDto } from "../dto/query-user.dto";
import { UpdateUserBalanceDto, UpdateUserDto } from "../dto/update-user.dto";

/**
 * 用户会员等级信息（包含订阅时间）
 */
export interface UserMembershipInfo {
    /** 等级ID */
    id: string;
    /** 等级名称 */
    name: string;
    /** 等级图标 */
    icon: string;
    /** 等级级别 */
    level: number;
    /** 订阅开始时间 */
    startTime: Date;
    /** 订阅到期时间 */
    endTime: Date;
}

/**
 * 用户服务
 */
@Injectable()
export class UserService extends BaseService<User> {
    /**
     * 构造函数
     *
     * @param userRepository 用户仓库
     */
    constructor(
        private readonly appBillingService: AppBillingService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(UserSubscription)
        private readonly userSubscriptionRepository: Repository<UserSubscription>,
        @InjectRepository(MembershipLevels)
        private readonly membershipLevelsRepository: Repository<MembershipLevels>,
        @Inject(RolePermissionService)
        private readonly rolePermissionService: RolePermissionService,
    ) {
        super(userRepository);
    }

    /**
     * 分页查询用户列表
     *
     * @param dto 查询条件
     * @returns 用户列表和分页信息
     */
    async list(dto: QueryUserDto, user: UserPlayground): Promise<any> {
        const where: any[] = [];

        // 关键词模糊查询 - 搜索用户名、昵称、邮箱、手机号
        if (dto.keyword) {
            where.push([
                { username: Like(`%${dto.keyword}%`), isRoot: 0 },
                { nickname: Like(`%${dto.keyword}%`), isRoot: 0 },
                { email: Like(`%${dto.keyword}%`), isRoot: 0 },
                { phone: Like(`%${dto.keyword}%`), isRoot: 0 },
            ]);
        }

        // 状态筛选
        if (dto.status !== undefined && dto.status !== null) {
            if (where.length > 0) {
                // 如果已有关键词查询条件，需要与状态条件组合
                where.forEach((conditions) => {
                    if (Array.isArray(conditions)) {
                        conditions.forEach((condition) => {
                            condition.status = dto.status;
                        });
                    } else {
                        conditions.status = dto.status;
                    }
                });
            } else {
                where.push({ status: dto.status, isRoot: 0 });
            }
        }

        // 日期范围筛选
        if (dto.startTime && dto.endTime) {
            const dateCondition = {
                createdAt: Between(dto.startTime, dto.endTime),
                isRoot: 0,
            };
            if (where.length > 0) {
                // 如果已有其他查询条件，需要与日期条件组合
                where.forEach((conditions) => {
                    if (Array.isArray(conditions)) {
                        conditions.forEach((condition) => {
                            Object.assign(condition, dateCondition);
                        });
                    } else {
                        Object.assign(conditions, dateCondition);
                    }
                });
            } else {
                where.push(dateCondition);
            }
        }

        // 如果没有任何查询条件，添加默认的排除超级管理员条件
        if (!isEnabled(user.isRoot)) {
            where.push({ isRoot: 0 });
        }

        const result = await this.paginate(dto, {
            where: where.length > 0 ? where : undefined,
            relations: ["role"],
            order: { createdAt: "DESC" },
            excludeFields: ["password", "openid"],
        });

        // 批量查询用户的最高会员等级
        if (result.items?.length) {
            const userIds = result.items.map((item) => item.id);
            const membershipMap = await this.batchGetUserHighestMembershipLevel(userIds);
            result.items = result.items.map((item) => ({
                ...item,
                membershipLevel: membershipMap.get(item.id) ?? null,
            }));
        }

        return result;
    }

    /**
     * 批量获取用户的最高会员等级信息
     *
     * @param userIds 用户ID列表
     * @returns Map<userId, UserMembershipInfo | null>
     */
    private async batchGetUserHighestMembershipLevel(
        userIds: string[],
    ): Promise<Map<string, UserMembershipInfo | null>> {
        const resultMap = new Map<string, UserMembershipInfo | null>();

        if (userIds.length === 0) {
            return resultMap;
        }

        // 批量查询所有用户订阅（包含开始和结束时间）
        const subscriptions = await this.userSubscriptionRepository.find({
            where: {
                userId: In(userIds),
            },
            select: ["userId", "levelId", "startTime", "endTime"],
        });

        // 按用户分组订阅信息
        const userSubscriptionsMap = new Map<
            string,
            { levelId: string; startTime: Date; endTime: Date }[]
        >();
        subscriptions.forEach((sub) => {
            if (sub.levelId) {
                const subs = userSubscriptionsMap.get(sub.userId) ?? [];
                subs.push({
                    levelId: sub.levelId,
                    startTime: sub.startTime,
                    endTime: sub.endTime,
                });
                userSubscriptionsMap.set(sub.userId, subs);
            }
        });

        // 收集所有需要查询的等级ID
        const allLevelIds = new Set<string>();
        userSubscriptionsMap.forEach((subs) => {
            subs.forEach((sub) => allLevelIds.add(sub.levelId));
        });

        if (allLevelIds.size === 0) {
            // 所有用户都没有有效会员
            userIds.forEach((userId) => resultMap.set(userId, null));
            return resultMap;
        }

        // 批量查询所有等级信息
        const levels = await this.membershipLevelsRepository.find({
            where: { id: In([...allLevelIds]) },
            select: ["id", "name", "icon", "level"],
        });
        const levelMap = new Map(levels.map((l) => [l.id, l]));

        // 为每个用户找出最高等级及其订阅时间
        userIds.forEach((userId) => {
            const subs = userSubscriptionsMap.get(userId);
            if (!subs || subs.length === 0) {
                resultMap.set(userId, null);
                return;
            }

            // 找出该用户订阅中最高等级的
            // 如果有多个相同等级的会员，选择结束日期最晚的
            let highestInfo: UserMembershipInfo | null = null;
            subs.forEach((sub) => {
                const level = levelMap.get(sub.levelId);
                if (!level) return;

                if (!highestInfo) {
                    // 第一个订阅，直接设置
                    highestInfo = {
                        id: level.id,
                        name: level.name,
                        icon: level.icon,
                        level: level.level,
                        startTime: sub.startTime,
                        endTime: sub.endTime,
                    };
                } else if (level.level > highestInfo.level) {
                    // 等级更高，直接更新
                    highestInfo = {
                        id: level.id,
                        name: level.name,
                        icon: level.icon,
                        level: level.level,
                        startTime: sub.startTime,
                        endTime: sub.endTime,
                    };
                } else if (level.level === highestInfo.level) {
                    // 等级相同，选择结束日期最晚的
                    const currentEndTime = new Date(sub.endTime).getTime();
                    const highestEndTime = new Date(highestInfo.endTime).getTime();
                    if (currentEndTime > highestEndTime) {
                        highestInfo = {
                            id: level.id,
                            name: level.name,
                            icon: level.icon,
                            level: level.level,
                            startTime: sub.startTime,
                            endTime: sub.endTime,
                        };
                    }
                }
                // 如果 level.level < highestInfo.level，则跳过
            });

            resultMap.set(userId, highestInfo);
        });

        return resultMap;
    }

    /**
     * 获取单个用户的最高会员等级信息
     *
     * @param userId 用户ID
     * @returns 用户会员等级信息或 null
     */
    async getUserMembershipLevel(userId: string): Promise<UserMembershipInfo | null> {
        const resultMap = await this.batchGetUserHighestMembershipLevel([userId]);
        return resultMap.get(userId) ?? null;
    }

    /**
     * 创建用户
     *
     * @param createUserDto 创建用户DTO
     * @returns 创建的用户
     */
    async createUser(createUserDto: CreateUserDto): Promise<Partial<User>> {
        // 检查用户名是否已存在
        const existUser = await this.userRepository.findOne({
            where: { username: createUserDto.username },
        });

        if (existUser) {
            throw HttpErrorFactory.business(
                `用户名 ${createUserDto.username} 已存在`,
                BusinessCode.DATA_ALREADY_EXISTS,
            );
        }

        // 密码加密
        const hashedPassword = await this.hashPassword(createUserDto.password);

        // 生成随机昵称
        let nickname = createUserDto.nickname;
        if (!nickname) {
            // 从昵称列表中随机选择一个
            const randomNickname = nicknameData[Math.floor(Math.random() * nicknameData.length)];
            // 生成4位随机字符（数字和字母）
            const randomChars = Math.random().toString(36).substring(2, 6);
            // 组合成最终的昵称
            nickname = `${randomNickname}_${randomChars}`;
        }

        // 创建用户实例
        const user = this.userRepository.create({
            ...createUserDto,
            password: hashedPassword,
            nickname,
            source: UserCreateSource.CONSOLE,
            userNo: await generateNo(this.userRepository, "userNo"),
            avatar: createUserDto.avatar
                ? createUserDto.avatar
                : `/static/avatars/${Math.floor(Math.random() * 33) + 1}.png`,
        });

        // 如果有角色ID，添加角色关联
        if (createUserDto.roleId) {
            const role = await this.roleRepository.findOne({
                where: {
                    id: createUserDto.roleId,
                },
            });

            if (!role) {
                throw HttpErrorFactory.notFound("角色不存在");
            }

            user.role = role;
        }

        // 保存用户
        const result = await this.userRepository.save(user);

        // 处理会员订阅信息
        if (createUserDto.level && createUserDto.levelEndTime) {
            const level = await this.membershipLevelsRepository.findOne({
                where: { id: createUserDto.level },
            });

            if (!level) {
                throw HttpErrorFactory.notFound("会员等级不存在");
            }

            const endTime = new Date(createUserDto.levelEndTime);
            const startTime = new Date();

            // 创建用户订阅记录
            const subscription = this.userSubscriptionRepository.create({
                userId: result.id,
                levelId: createUserDto.level,
                startTime,
                endTime,
                source: 0, // 0-系统
                orderId: null,
            });

            await this.userSubscriptionRepository.save(subscription);
        }

        // 查询完整的用户信息，包含角色
        const userWithRole = await this.findOneById(result.id, {
            relations: ["role"],
            excludeFields: ["password", "openid"],
        });

        return userWithRole;
    }

    /**
     * 修改用户密码
     *
     * @param id 用户ID
     * @param oldPassword 旧密码
     * @param newPassword 新密码
     * @returns 是否成功
     */
    async changePassword(
        id: string,
        oldPassword: string,
        newPassword: string,
    ): Promise<Partial<User>> {
        // 检查用户是否存在
        const user = await this.findOneById(id);

        // 验证旧密码
        const isPasswordValid = await this.comparePassword(oldPassword, user.password);

        if (!isPasswordValid) {
            throw HttpErrorFactory.business("旧密码不正确", BusinessCode.PARAM_INVALID);
        }

        // 加密新密码
        const hashedPassword = await this.hashPassword(newPassword);

        return this.updateById(
            id,
            { password: hashedPassword },
            { excludeFields: ["password", "openid"] },
        );
    }

    /**
     * 重置用户密码
     *
     * @param id 用户ID
     * @param newPassword 新密码
     * @returns 是否成功
     */
    async resetPassword(id: string, newPassword: string): Promise<Partial<User>> {
        // 检查用户是否存在
        const user = await this.findOneById(id);

        if (!user) {
            throw HttpErrorFactory.notFound(`ID为 ${id} 的用户不存在`);
        }

        // 加密新密码
        const hashedPassword = await this.hashPassword(newPassword);

        return this.updateById(
            id,
            { password: hashedPassword },
            { excludeFields: ["password", "openid"] },
        );
    }

    /**
     * 启用/禁用用户
     *
     * @param id 用户ID
     * @param status 状态（0: 禁用, 1: 启用）
     * @returns 更新后的用户
     */
    async setUserStatus(id: string, status: BooleanNumberType): Promise<Partial<User>> {
        // 检查用户是否存在
        const user = await this.findOneById(id);

        if (!user) {
            throw HttpErrorFactory.notFound(`ID为 ${id} 的用户不存在`);
        }

        return this.updateById(id, { status }, { excludeFields: ["password"] });
    }

    /**
     * 密码加密
     *
     * @param password 明文密码
     * @returns 加密后的密码
     */
    async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    /**
     * 密码比较
     *
     * @param password 明文密码
     * @param hashedPassword 加密后的密码
     * @returns 是否匹配
     */
    private async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(password, hashedPassword);
    }

    /**
     * 生成随机密码
     *
     * @param length 密码长度，默认为12
     * @returns 生成的随机密码
     */
    async generateRandomPassword(length: number = 12): Promise<string> {
        // 定义可能的字符集
        const uppercaseChars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // 排除容易混淆的字符 I, O
        const lowercaseChars = "abcdefghijkmnpqrstuvwxyz"; // 排除容易混淆的字符 l, o
        const numberChars = "23456789"; // 排除容易混淆的字符 0, 1
        const specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

        // 合并所有字符集
        const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;

        // 确保密码至少包含一个大写字母、一个小写字母、一个数字和一个特殊字符
        let password = "";
        password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
        password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
        password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
        password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));

        // 生成剩余的随机字符
        for (let i = 4; i < length; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }

        // 打乱密码字符顺序
        password = password
            .split("")
            .sort(() => 0.5 - Math.random())
            .join("");

        return password;
    }

    /**
     * 更新用户
     *
     * @param id 用户ID
     * @param updateData 更新数据
     * @param options 查询选项
     * @returns 更新后的用户
     */
    async updateUserById(
        id: string,
        updateData: UpdateUserDto | DeepPartial<User>,
        options?: { excludeFields?: string[] },
    ): Promise<Partial<User>> {
        // 检查用户是否存在
        const user = await this.findOneById(id);
        if (!user) {
            throw HttpErrorFactory.notFound(`ID为 ${id} 的用户不存在`);
        }

        // 处理角色关联
        let role = null;

        // 如果传入了 roleId 字段且有值，查找对应角色
        if ("roleId" in updateData && updateData.roleId && updateData.roleId.trim() !== "") {
            role = await this.roleRepository.findOne({
                where: { id: updateData.roleId },
            });
            if (!role) {
                throw HttpErrorFactory.notFound("角色不存在");
            }
        }

        // 移除 roleId，因为我们要单独处理角色关联
        const { roleId: _roleId, ...restUpdateData } = updateData as UpdateUserDto;

        // 更新用户基本数据（使用 save 方法触发生命周期钩子）
        Object.assign(user, restUpdateData);
        await this.userRepository.save(user);

        // 更新角色关联（总是执行）
        await this.userRepository
            .createQueryBuilder()
            .relation(User, "role")
            .of(id)
            .set(role ? role.id : null);

        // 处理会员订阅信息
        if ("level" in updateData || "levelEndTime" in updateData) {
            const levelId = "level" in updateData ? updateData.level : undefined;
            const levelEndTime = "levelEndTime" in updateData ? updateData.levelEndTime : undefined;

            // 如果提供了会员等级信息，则创建或更新订阅记录
            if (levelId && levelEndTime) {
                const level = await this.membershipLevelsRepository.findOne({
                    where: { id: levelId },
                });

                if (!level) {
                    throw HttpErrorFactory.notFound("会员等级不存在");
                }

                const endTime = new Date(levelEndTime);
                const startTime = new Date();

                // 查找用户是否已有系统来源的订阅记录
                const existingSubscription = await this.userSubscriptionRepository.findOne({
                    where: {
                        userId: id,
                        source: 0, // 0-系统
                    },
                });

                if (existingSubscription) {
                    // 更新现有订阅记录
                    existingSubscription.levelId = levelId;
                    existingSubscription.startTime = startTime;
                    existingSubscription.endTime = endTime;
                    await this.userSubscriptionRepository.save(existingSubscription);
                } else {
                    // 创建新的订阅记录
                    const subscription = this.userSubscriptionRepository.create({
                        userId: id,
                        levelId,
                        startTime,
                        endTime,
                        source: 0, // 0-系统
                        orderId: null,
                    });
                    await this.userSubscriptionRepository.save(subscription);
                }
            } else if (levelId === null || levelId === undefined) {
                // 如果设置为普通用户，删除该用户的所有订阅记录（包括系统赠送和自己购买的）
                await this.userSubscriptionRepository.delete({
                    userId: id,
                });
            }
        }

        // 查询更新后的完整用户信息
        const result = await this.findOneById(id, {
            relations: ["role"],
            excludeFields: options?.excludeFields || ["password", "openid"],
        });

        return result;
    }

    /**
     * Update user balance
     *
     * @param userId User ID
     * @param dto Update data
     * @param currentUser Current user
     * @returns Updated user
     */
    async updateBalance(userId: string, dto: UpdateUserBalanceDto, currentUser: UserPlayground) {
        try {
            // Use AppBillingService to handle power changes based on action type
            if (dto.action === ACTION.INC) {
                // Add power
                await this.appBillingService.addUserPower({
                    userId,
                    amount: dto.amount,
                    accountType: ACCOUNT_LOG_TYPE.SYSTEM_MANUAL_INC,
                    source: {
                        type: ACCOUNT_LOG_SOURCE.SYSTEM,
                        source: "系统操作",
                    },
                    remark: "系统调整用户积分",
                    associationUserId: currentUser.id,
                });
            } else {
                // Deduct power
                await this.appBillingService.deductUserPower({
                    userId,
                    amount: dto.amount,
                    accountType: ACCOUNT_LOG_TYPE.SYSTEM_MANUAL_DEC,
                    source: {
                        type: ACCOUNT_LOG_SOURCE.SYSTEM,
                        source: "系统操作",
                    },
                    remark: "系统调整用户积分",
                    associationUserId: currentUser.id,
                });
            }

            // Return updated user information
            return this.findOneById(userId, {
                excludeFields: ["password", "openid"],
            });
        } catch (error) {
            throw HttpErrorFactory.badRequest(String(error.message));
        }
    }

    /**
     * 批量更新用户
     *
     * @param dto 批量更新用户DTO
     * @param currentUserId 当前操作用户ID
     * @returns 更新结果
     */
    async batchUpdate(
        dto: BatchUpdateUserDto,
        currentUserId: string,
    ): Promise<{
        success: boolean;
        total: number;
        succeeded: number;
        failed: number;
        errors: Array<{ id: string; message: string }>;
    }> {
        const { users, skipErrors = false } = dto;
        const result = {
            success: true,
            total: users.length,
            succeeded: 0,
            failed: 0,
            errors: [] as Array<{ id: string; message: string }>,
        };

        // 查询所有要更新的用户
        const userIds = users.map((user) => user.id);
        const existingUsers = await this.findAll({
            where: {
                id: In(userIds),
            },
        });

        // 创建ID到用户的映射，方便后续查找
        const userMap = new Map<string, User>();
        existingUsers.forEach((user) => userMap.set(user.id, user));

        // 逐个处理用户更新
        for (const userItem of users) {
            try {
                const existingUser = userMap.get(userItem.id);

                // 检查用户是否存在
                if (!existingUser) {
                    throw new Error(`ID为 ${userItem.id} 的用户不存在`);
                }

                // 检查权限：如果要修改的是超级管理员
                if (isEnabled(existingUser.isRoot)) {
                    // 只有超级管理员本人可以修改自己的信息
                    if (currentUserId !== userItem.id) {
                        throw new Error(`无权修改超级管理员(${userItem.id})的信息`);
                    }
                }

                // Check if there is a power change
                if (userItem.power !== undefined) {
                    const user = await this.findOneById(userItem.id);
                    if (user) {
                        // Calculate the change amount
                        const powerDiff = userItem.power - user.power;

                        if (powerDiff !== 0) {
                            // Determine whether to add or deduct
                            const amount = Math.abs(powerDiff);

                            // Use AppBillingService to handle power changes
                            if (powerDiff > 0) {
                                // Add power
                                await this.appBillingService.addUserPower({
                                    userId: userItem.id,
                                    amount,
                                    accountType: ACCOUNT_LOG_TYPE.SYSTEM_MANUAL_INC,
                                    source: {
                                        type: ACCOUNT_LOG_SOURCE.SYSTEM,
                                        source: "批量更新",
                                    },
                                    remark: `批量更新操作，积分变动：+${powerDiff}`,
                                    associationUserId: currentUserId,
                                });
                            } else {
                                // Deduct power
                                await this.appBillingService.deductUserPower({
                                    userId: userItem.id,
                                    amount,
                                    accountType: ACCOUNT_LOG_TYPE.SYSTEM_MANUAL_DEC,
                                    source: {
                                        type: ACCOUNT_LOG_SOURCE.SYSTEM,
                                        source: "批量更新",
                                    },
                                    remark: `批量更新操作，积分变动：${powerDiff}`,
                                    associationUserId: currentUserId,
                                });
                            }

                            // Remove power field from update object as it has been handled separately
                            delete userItem.power;
                        }
                    }
                }

                // 执行其他字段的更新
                if (Object.keys(userItem).length > 1) {
                    // 至少有id和其他字段
                    await this.updateById(userItem.id, userItem, {
                        excludeFields: ["password"],
                    });
                }

                // 更新成功后清理该用户的权限相关缓存（忽略清理失败，不影响主流程）
                this.rolePermissionService
                    .clearUserCache(userItem.id)
                    .catch((e) => this.logger?.warn?.(`清理用户缓存失败: ${e.message}`));

                result.succeeded++;
            } catch (error) {
                result.failed++;
                result.errors.push({
                    id: userItem.id,
                    message: error.message,
                });

                // 如果不跳过错误，则立即返回
                if (!skipErrors) {
                    result.success = false;
                    return result;
                }
            }
        }

        // 如果有失败的更新，设置整体结果为失败
        if (result.failed > 0) {
            result.success = false;
        }

        return result;
    }
}
