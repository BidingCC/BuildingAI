import nicknameData from "@assets/nickname.json";
import { BaseService } from "@buildingai/base";
import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import {
    BooleanNumber,
    UserCreateSource,
    UserTerminal,
    UserTerminalType,
} from "@buildingai/constants/shared/status-codes.constant";
import { checkUserLoginPlayground } from "@buildingai/db";
import { LoginUserPlayground, UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User, UserToken } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { generateNo } from "@buildingai/utils";
import { isDisabled } from "@buildingai/utils";
import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import { RegisterDto } from "../dto/register.dto";
import { RolePermissionService } from "./role-permission.service";
import { UserTokenService } from "./user-token.service";

/**
 * 认证服务
 *
 * 处理用户认证、令牌生成等功能
 */
@Injectable()
export class AuthService extends BaseService<User> {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private rolePermissionService: RolePermissionService,
        public userTokenService: UserTokenService,
    ) {
        super(userRepository);
    }

    /**
     * 验证令牌
     *
     * @param token JWT令牌
     * @returns 验证结果
     */
    async validateToken(token: string | undefined): Promise<{
        isValid: boolean;
        user: UserPlayground | undefined;
        tokenRecord?: UserToken;
        error?: string;
        errorType?: string;
        originalError?: any;
    }> {
        try {
            if (!token) {
                return {
                    isValid: false,
                    user: undefined,
                    error: "缺少访问令牌",
                };
            }
            // 使用令牌服务验证令牌
            const result = await this.userTokenService.validateToken(token);

            if (!result.isValid) {
                this.logger.warn(`令牌验证失败: ${result.error}`);
                return {
                    isValid: false,
                    user: undefined,
                    error: result.error,
                    errorType: "JsonWebTokenError",
                };
            }

            const payload = result.payload as LoginUserPlayground;

            // 从数据库验证用户是否仍然存在
            const user = await this.findOne({
                where: { id: payload.id },
            });

            if (!user) {
                return {
                    isValid: false,
                    user: undefined,
                    error: "无效的令牌",
                    errorType: "JsonWebTokenError",
                };
            }

            let updatedPayload: UserPlayground;

            const role = await this.rolePermissionService.getUserRoles(user.id);
            const permissions = await this.rolePermissionService.getUserPermissions(user.id);

            updatedPayload = {
                ...payload,
                role,
                permissions,
            };

            return {
                isValid: true,
                user: updatedPayload,
                tokenRecord: result.tokenRecord,
            };
        } catch (error) {
            return {
                isValid: false,
                user: undefined,
                error: error.message,
                errorType: error.name, // 保留原始异常类型
                originalError: error, // 保留完整的原始异常对象
            };
        }
    }

    /**
     * 用户注册
     *
     * @param registerDto 注册信息
     * @param terminal 注册终端
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @returns 注册结果
     */
    async register(
        registerDto: RegisterDto,
        terminal: UserTerminalType = UserTerminal.PC,
        ipAddress?: string,
        userAgent?: string,
    ) {
        const { password, confirmPassword } = registerDto;
        if (password !== confirmPassword) {
            throw HttpErrorFactory.badRequest("两次密码不一致", BusinessCode.VALIDATION_FAILED);
        }

        // 检查用户名是否已存在
        const existingUser = await this.userRepository.findOne({
            where: { username: registerDto.username },
        });

        if (existingUser) {
            throw HttpErrorFactory.badRequest("用户名已被占用", BusinessCode.USER_ALREADY_EXISTS);
        }

        // 加密密码
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(registerDto.password, salt);

        const { nickname, avatar } = this.generateRandomName();
        const userNo = await generateNo(this.userRepository, "userNo");
        // 创建用户
        const savedUser = await this.create(
            {
                username: registerDto.username,
                password: hashedPassword,
                nickname,
                status: BooleanNumber.YES, // 默认启用
                source: UserCreateSource.USERNAME,
                avatar,
                userNo,
            },
            { excludeFields: ["password"] },
        );

        // 生成&验证令牌
        const payload = checkUserLoginPlayground({
            id: savedUser.id,
            username: savedUser.username,
            isRoot: BooleanNumber.NO,
            terminal: terminal,
        });

        // 创建并存储令牌
        const tokenResult = await this.userTokenService.createToken(
            savedUser.id,
            payload,
            terminal,
            ipAddress,
            userAgent,
        );

        // 返回登录结果
        return {
            token: tokenResult.token,
            expiresAt: tokenResult.expiresAt,
            user: {
                ...savedUser,
                permission: [],
                role: {},
            },
        };
    }

    /**
     * 用户登录
     *
     * @param username 用户名
     * @param password 密码
     * @param terminal 登录终端
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @returns 登录结果
     */
    async login(
        username: string,
        password: string,
        terminal: UserTerminalType = UserTerminal.PC,
        ipAddress?: string,
        userAgent?: string,
    ) {
        // 查找用户
        const user = await this.findOne({
            where: { username },
            relations: ["role", "permissions"],
        });

        // 如果用户不存在
        if (!user) {
            throw HttpErrorFactory.unauthorized("用户名或密码错误", BusinessCode.LOGIN_FAILED);
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw HttpErrorFactory.unauthorized("用户名或密码错误", BusinessCode.LOGIN_FAILED);
        }

        // 检查用户状态
        if (isDisabled(user.status)) {
            throw HttpErrorFactory.forbidden(
                "账号已被禁用，请联系客服",
                BusinessCode.USER_DISABLED,
            );
        }

        // 获取用户角色和权限信息
        const role = await this.rolePermissionService.getUserRoles(user.id);
        const permissions = await this.rolePermissionService.getUserPermissions(user.id);

        // 生成&验证令牌
        const payload = checkUserLoginPlayground({
            id: user.id,
            username: user.username,
            isRoot: user.isRoot,
            terminal: terminal,
        });

        // 创建并存储令牌
        const tokenResult = await this.userTokenService.createToken(
            user.id,
            payload,
            terminal,
            ipAddress,
            userAgent,
        );

        // 更新用户最后登录时间
        await this.updateById(user.id, {
            lastLoginAt: new Date(),
        });

        const { password: _pwd, ...userInfo } = user;

        return {
            token: tokenResult.token,
            expiresAt: tokenResult.expiresAt,
            user: {
                ...userInfo,
                role,
                permissions,
            },
        };
    }

    /**
     * 通过 openid 查找用户，如果没有绑定则自动注册，有则直接登录
     *
     * @param openid 微信 openid
     * @param terminal 登录终端
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @returns 登录结果
     */
    async loginOrRegisterByOpenid(
        openid: string,
        terminal: UserTerminalType = UserTerminal.PC,
        ipAddress?: string,
        userAgent?: string,
    ) {
        // 查找是否已有用户绑定此 openid
        const existingUser = await this.findOne({
            where: { openid },
        });

        if (existingUser) {
            // 用户已存在，直接登录
            return this.loginByUser(existingUser, terminal, ipAddress, userAgent);
        } else {
            // 用户不存在，自动注册
            return this.registerByOpenid(openid, terminal, ipAddress, userAgent);
        }
    }

    /**
     * 通过 openid 自动注册用户
     *
     * @param openid 微信 openid
     * @param terminal 注册终端
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @returns 注册结果
     */
    private async registerByOpenid(
        openid: string,
        terminal: UserTerminalType = UserTerminal.PC,
        ipAddress?: string,
        userAgent?: string,
    ) {
        const { nickname, username, avatar } = this.generateRandomName();

        // 创建用户
        const savedUser = await this.create(
            {
                openid,
                username,
                nickname,
                password: "",
                status: BooleanNumber.YES, // 默认启用
                source: UserCreateSource.WECHAT, // 标记为微信注册
                avatar,
            },
            { excludeFields: ["password", "openid"] },
        );

        // 重新获取完整的用户信息以确保类型正确
        const fullUser = await this.findOne({
            where: { id: savedUser.id },
        });

        if (!fullUser) {
            throw HttpErrorFactory.badRequest("用户创建失败");
        }

        // 生成&验证令牌
        const payload = checkUserLoginPlayground({
            id: fullUser.id,
            username: fullUser.username,
            isRoot: BooleanNumber.NO,
            terminal: terminal,
        });

        // 创建并存储令牌
        const tokenResult = await this.userTokenService.createToken(
            fullUser.id,
            payload,
            terminal,
            ipAddress,
            userAgent,
        );

        // 返回登录结果
        return {
            expiresAt: tokenResult.expiresAt,
            user: {
                token: tokenResult.token,
                ...fullUser,
                permission: [],
                role: {},
            },
        };
    }

    /**
     * 通过用户对象直接登录
     *
     * @param user 用户对象
     * @param terminal 登录终端
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @returns 登录结果
     */
    private async loginByUser(
        user: User,
        terminal: UserTerminalType = UserTerminal.PC,
        ipAddress?: string,
        userAgent?: string,
    ) {
        // 检查用户状态
        if (isDisabled(user.status)) {
            throw HttpErrorFactory.forbidden(
                "账号已被禁用，请联系客服",
                BusinessCode.USER_DISABLED,
            );
        }

        // 获取用户角色和权限信息
        const role = await this.rolePermissionService.getUserRoles(user.id);
        const permissions = await this.rolePermissionService.getUserPermissions(user.id);

        // 生成&验证令牌
        const payload = checkUserLoginPlayground({
            id: user.id,
            username: user.username,
            isRoot: user.isRoot,
            terminal: terminal,
        });

        // 创建并存储令牌
        const tokenResult = await this.userTokenService.createToken(
            user.id,
            payload,
            terminal,
            ipAddress,
            userAgent,
        );

        // 更新用户最后登录时间
        await this.updateById(user.id, {
            lastLoginAt: new Date(),
        });

        const { password: _pwd, openid: _openid, ...userInfo } = user;

        return {
            expiresAt: tokenResult.expiresAt,
            user: {
                token: tokenResult.token,
                ...userInfo,
                role,
                permissions,
            },
        };
    }

    /**
     * 修改用户密码
     *
     * @param userId 用户ID
     * @param oldPassword 旧密码
     * @param newPassword 新密码
     * @param confirmPassword 确认密码
     * @returns 修改结果
     */
    async changePassword(
        userId: string,
        oldPassword: string,
        newPassword: string,
        confirmPassword: string,
    ) {
        // 验证新密码与确认密码是否一致
        if (newPassword !== confirmPassword) {
            throw HttpErrorFactory.badRequest(
                "新密码与确认密码不一致",
                BusinessCode.VALIDATION_FAILED,
            );
        }

        // 查找用户，只需要基本信息和密码字段
        const user = await this.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw HttpErrorFactory.notFound(`ID为 ${userId} 的用户不存在`);
        }

        // 验证旧密码
        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            throw HttpErrorFactory.unauthorized("旧密码不正确", BusinessCode.PASSWORD_INCORRECT);
        }

        // 生成新密码的哈希
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 更新密码
        await this.updateById(userId, {
            password: hashedPassword,
        });

        return null;
    }

    /**
     * 退出登录
     *
     * 在撤销令牌后，清理该用户的角色与权限缓存：
     * - user_roles:${userId}
     * - user_permissions:${userId}
     *
     * @param token JWT令牌
     * @returns 退出结果
     */
    async logout(token: string): Promise<{ success: boolean; message: string }> {
        try {
            // 先查找令牌记录以获取 userId（即使令牌已过期，记录仍可能存在）
            const tokenRecord = await this.userTokenService.findOne({
                where: { token },
            });
            const userId = tokenRecord?.userId;

            const result = await this.userTokenService.revokeToken(token);

            if (result) {
                // 撤销成功后清理该用户的权限相关缓存（忽略清理失败，不影响主流程）
                if (userId) {
                    this.rolePermissionService
                        .clearUserCache(userId)
                        .catch((e) => this.logger.warn(`清理用户缓存失败: ${e.message}`));
                }

                return {
                    success: true,
                    message: "退出登录成功",
                };
            } else {
                return {
                    success: false,
                    message: "令牌不存在或已失效",
                };
            }
        } catch (error) {
            this.logger.error(`退出登录失败: ${error.message}`);
            throw HttpErrorFactory.internal("退出登录失败", BusinessCode.OPERATION_FAILED);
        }
    }

    async loginBySms(
        phone: string,
        phoneAreaCode: string,
        terminal: UserTerminalType = UserTerminal.PC,
        ipAddress?: string,
        userAgent?: string,
    ) {
        const user = await this.findOne({ where: { phone, phoneAreaCode } });

        if (!user) {
            return this.registerByPhone(phone, phoneAreaCode, terminal, ipAddress, userAgent);
        }

        return this.loginByUser(user, terminal, ipAddress, userAgent);
    }

    private async registerByPhone(
        phone: string,
        phoneAreaCode: string,
        terminal: UserTerminalType = UserTerminal.PC,
        ipAddress?: string,
        userAgent?: string,
    ) {
        const { username, nickname, avatar } = this.generateRandomName();
        const userNo = await generateNo(this.userRepository, "userNo");

        // Create user
        const savedUser = await this.create(
            {
                phone,
                phoneAreaCode,
                username,
                nickname,
                avatar,
                userNo,
                password: "",
                status: BooleanNumber.YES,
                source: UserCreateSource.PHONE,
            },
            { excludeFields: ["password"] },
        );

        // Create token
        const payload = checkUserLoginPlayground({
            id: savedUser.id,
            username: savedUser.username,
            isRoot: BooleanNumber.NO,
            terminal,
        });

        const tokenResult = await this.userTokenService.createToken(
            savedUser.id,
            payload,
            terminal,
            ipAddress,
            userAgent,
        );

        return {
            token: tokenResult.token,
            expiresAt: tokenResult.expiresAt,
            user: {
                ...savedUser,
                permission: [],
                role: {},
            },
        };
    }

    private generateRandomName() {
        // 生成随机用户名（随机字符串）
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const randomUsername = `${randomSuffix}`;

        // 生成随机昵称
        const randomIndex = Math.floor(Math.random() * nicknameData.length);
        const randomNickname = nicknameData[randomIndex];

        // 随机头像索引
        const randomAvatarIndex = Math.floor(Math.random() * 36) + 1;
        const randomAvatar = `/static/avatars/${randomAvatarIndex}.png`;

        return {
            username: randomUsername,
            nickname: randomNickname,
            avatar: randomAvatar,
        };
    }
}
