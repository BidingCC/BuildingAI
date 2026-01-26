import {
    BooleanNumber,
    type BooleanNumberType,
    UserCreateSource,
    type UserCreateSourceType,
} from "@buildingai/constants/shared/status-codes.constant";

import { AppEntity } from "../decorators/app-entity.decorator";
import { NormalizeFileUrl } from "../decorators/file-url.decorator";
import { Role } from "../entities/role.entity";
import { Column, JoinColumn, JoinTable, ManyToMany, ManyToOne } from "../typeorm";
import { SoftDeleteBaseEntity } from "./base";
import { Permission } from "./permission.entity";

/**
 * 用户实体
 *
 * 定义系统中的用户用户及其关联的角色和直接权限
 */
@AppEntity({ name: "user", comment: "用户信息" })
export class User extends SoftDeleteBaseEntity {
    @Column({ nullable: true })
    userNo: string;
    /**
     * 用户名
     */
    @Column({ unique: true })
    username: string;

    /**
     * 密码
     *
     * 加密后的密码哈希
     */
    @Column()
    password: string;

    /**
     * 用户昵称
     */
    @Column({ nullable: true })
    nickname: string;

    /**
     * 用户邮箱
     */
    @Column({ nullable: true })
    email: string;

    /**
     * 用户手机号
     */
    @Column({ nullable: true })
    phone: string;

    /**
     * 手机号区号
     *
     * 国际区号，如：86, 1, 81, 44等
     */
    @Column({ nullable: true })
    phoneAreaCode: string;

    /**
     * 用户头像
     */
    @Column({ nullable: true })
    @NormalizeFileUrl()
    avatar: string;

    /**
     * 真实姓名
     */
    @Column({ nullable: true, length: 32, comment: "真实姓名" })
    realName: string;

    /**
     * 累计消费金额
     */
    @Column({
        type: "integer",
        default: 0,
        comment: "累计充值消费金额",
    })
    totalRechargeAmount: number;

    /**
     * 用户状态
     *
     * 0: 禁用, 1: 启用
     */
    @Column({ default: 1 })
    status: number;

    /**
     * 是否为超级管理员
     *
     * 0: 否, 1: 是
     */
    @Column({
        type: "enum",
        enum: BooleanNumber,
        default: BooleanNumber.NO,
        enumName: "boolean_number_enum",
    })
    isRoot: BooleanNumberType;

    /**
     * 用户关联的角色
     *
     * 多对一关系，一个用户只能有一个角色，一个角色可以属于多个用户
     */
    @ManyToOne(() => Role, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "role_id" })
    role: Role;

    /**
     * 用户直接关联的权限
     *
     * 多对多关系，一个用户可以直接拥有多个权限，一个权限可以直接属于多个用户
     * 这些权限是直接分配给用户的，与角色无关
     */
    @ManyToMany(() => Permission)
    @JoinTable({
        name: "user_permissions",
        joinColumn: { name: "user_id", referencedColumnName: "id" },
        inverseJoinColumn: {
            name: "permission_id",
            referencedColumnName: "id",
        },
    })
    permissions: Permission[];

    /**
     * 最后一次登录时间
     */
    @Column({ type: "timestamp with time zone", nullable: true })
    lastLoginAt: Date | null;

    @Column({ default: 0, comment: "积分" })
    power: number;
    /**
     * 注册来源
     */
    @Column({
        type: "enum",
        enum: UserCreateSource,
        enumName: "user_create_source_enum",
    })
    source: UserCreateSourceType;
    /**
     * 用户oa_openid
     */
    @Column({ nullable: true, unique: true, comment: "用户oa_openid" })
    openid: string;

    /**
     * 用户mp_openid
     */
    @Column({ nullable: true, unique: true, comment: "用户mp_openid" })
    mpOpenid: string;

    /**
     * 用户unionid
     */
    @Column({ nullable: true, unique: true, comment: "用户unionid" })
    unionid: string;
}
