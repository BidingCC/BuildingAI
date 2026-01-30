import { TEAM_ROLE, type TeamRoleType } from "@buildingai/constants/shared/team-role.constants";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Datasets } from "./datasets.entity";
import { User } from "./user.entity";

/**
 * 会员申请状态
 */
export enum MemberApplicationStatus {
    /** 待审核 */
    PENDING = "pending",
    /** 已通过 */
    APPROVED = "approved",
    /** 已拒绝 */
    REJECTED = "rejected",
}

/**
 * 知识库会员申请实体（申请加入知识库的列表）
 */
@AppEntity({ name: "dataset_member_applications", comment: "知识库会员申请列表" })
@Index(["datasetId", "status"])
@Index(["userId", "status"])
export class DatasetMemberApplication extends BaseEntity {
    /**
     * 知识库ID
     */
    @Column({ type: "uuid", comment: "知识库ID" })
    datasetId: string;

    /**
     * 申请人用户ID
     */
    @Column({ type: "uuid", comment: "申请人用户ID" })
    userId: string;

    /**
     * 申请状态
     */
    @Column({
        type: "enum",
        enum: MemberApplicationStatus,
        default: MemberApplicationStatus.PENDING,
        comment: "申请状态：pending-待审核，approved-已通过，rejected-已拒绝",
    })
    status: MemberApplicationStatus;

    /**
     * 申请的角色（通过后赋予的角色）
     */
    @Column({
        type: "enum",
        enum: Object.values(TEAM_ROLE),
        default: TEAM_ROLE.VIEWER,
        comment: "申请的角色（通过后赋予）",
    })
    appliedRole: TeamRoleType;

    /**
     * 申请留言
     */
    @Column({ type: "text", nullable: true, comment: "申请留言" })
    message?: string | null;

    /**
     * 审核人ID
     */
    @Column({ type: "uuid", nullable: true, comment: "审核人ID" })
    reviewedBy?: string | null;

    /**
     * 审核时间
     */
    @Column({ type: "timestamptz", nullable: true, comment: "审核时间" })
    reviewedAt?: Date | null;

    /**
     * 拒绝原因
     */
    @Column({ type: "text", nullable: true, comment: "拒绝原因" })
    rejectReason?: string | null;

    // 关联实体

    /**
     * 关联的知识库
     */
    @ManyToOne(() => Datasets, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "dataset_id" })
    dataset?: Relation<Datasets>;

    /**
     * 关联的申请人
     */
    @ManyToOne(() => User, {
        createForeignKeyConstraints: false,
    })
    @JoinColumn({ name: "user_id" })
    user?: Relation<User>;

    /**
     * 关联的审核人
     */
    @ManyToOne(() => User, {
        createForeignKeyConstraints: false,
    })
    @JoinColumn({ name: "reviewed_by" })
    reviewer?: Relation<User>;
}
