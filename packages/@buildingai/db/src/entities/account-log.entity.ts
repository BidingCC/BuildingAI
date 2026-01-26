import { ACCOUNT_LOG_SOURCE_VALUE } from "@buildingai/constants/shared/account-log.constants";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne } from "../typeorm";
import { BaseEntity } from "./base";
import { User } from "./user.entity";

export type AccountLogSourceInfo = {
    type: ACCOUNT_LOG_SOURCE_VALUE;
    source: string;
};
@AppEntity({ name: "account_log", comment: "用户账户记录" })
export class AccountLog extends BaseEntity {
    @Column({
        type: "varchar",
        length: 64,
        comment: "编号",
    })
    accountNo: string;

    /**
     * 用户ID
     */
    @Column({
        type: "uuid",
        comment: "用户ID",
    })
    @Index()
    userId: string;

    @Column({
        type: "integer",
        comment: "变动类型",
    })
    accountType: number;

    /**
     * 动作
     */
    @Column({
        default: 1,
        comment: "动作:1-增加;false-0",
    })
    action: number;

    @Column({
        type: "integer",
        comment: "变动数量",
    })
    changeAmount: number;

    @Column({
        type: "integer",
        comment: "剩余数量",
    })
    leftAmount: number;

    @Column({
        type: "varchar",
        length: 64,
        nullable: true,
        comment: "关联单号",
    })
    associationNo: string;

    /**
     * 用户ID
     */
    @Column({
        type: "uuid",
        nullable: true,
        comment: "用户ID",
    })
    @Index()
    associationUserId: string;

    @Column({
        type: "jsonb",
        nullable: true,
        comment: "来源",
    })
    sourceInfo: AccountLogSourceInfo;

    @Column({
        type: "varchar",
        nullable: true,
        length: 64,
        comment: "备注",
    })
    remark: string;

    /**
     * 积分过期时间
     * 仅对会员赠送积分有效,到期后积分清零
     */
    @Column({
        type: "timestamp with time zone",
        nullable: true,
        comment: "积分过期时间",
    })
    @Index()
    expireAt: Date | null;

    /**
     * 当前记录剩余可用数量
     * 用于追踪赠送积分的使用情况,初始值等于 changeAmount
     */
    @Column({
        type: "integer",
        default: 0,
        comment: "当前记录剩余可用数量",
    })
    availableAmount: number;

    /**
     * 关联的用户
     */
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "user_id" })
    user: User;
}
