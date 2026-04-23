import { Column, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";

import { AppEntity } from "../decorators/app-entity.decorator";
import { BaseEntity } from "./base";
/**
 * 签到记录实体
 */
@AppEntity({ name: "sign_record", comment: "签到记录" })
export class SignRecord extends BaseEntity {
    /**
     * User ID
     */
    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    /**
     * 签到时间
     */
    @Column({ type: "timestamp", comment: "签到时间" })
    signTime: Date;

    /**
     * 签到日期(冗余字段)
     */
    @Column({ type: "timestamp", comment: "签到日期" })
    signDate: Date;

    /**
     * 终端类型
     */
    @Column({ type: "int", comment: "终端类型" })
    terminal: number;
    /**
     * 签到积分
     */
    @Column({ type: "int", comment: "签到积分" })
    signAward: number;
}
