import { TEAM_ROLE, type TeamRoleType } from "@buildingai/constants/shared/team-role.constants";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Datasets } from "./datasets.entity";
import { User } from "./user.entity";

/**
 * 知识库团队成员实体
 */
@AppEntity({ name: "dataset_members", comment: "知识库团队成员" })
@Index(["datasetId", "userId"], { unique: true }) // 确保用户在同一知识库中只能有一个角色
export class DatasetMember extends BaseEntity {
    /**
     * 知识库ID
     */
    @Column({ type: "uuid", comment: "知识库ID" })
    datasetId: string;

    /**
     * 用户ID
     */
    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    /**
     * 团队角色
     */
    @Column({
        type: "enum",
        enum: Object.values(TEAM_ROLE),
        comment: "团队角色：owner-所有者, manager-管理者, editor-编辑者, viewer-查看者",
    })
    role: TeamRoleType;

    /**
     * 邀请者ID
     */
    @Column({ type: "uuid", nullable: true, comment: "邀请者ID" })
    invitedBy?: string;

    /**
     * 最后活跃时间
     */
    @Column({ type: "timestamp", nullable: true, comment: "最后活跃时间" })
    lastActiveAt?: Date;

    /**
     * 是否启用
     */
    @Column({ type: "boolean", default: true, comment: "是否启用" })
    isActive: boolean;

    /**
     * 备注信息
     */
    @Column({ type: "text", nullable: true, comment: "备注信息" })
    note?: string;

    // 关联实体

    /**
     * 关联的知识库
     */
    @ManyToOne("Datasets", "members", {
        createForeignKeyConstraints: false,
    })
    @JoinColumn({ name: "dataset_id" })
    dataset?: Relation<Datasets>;

    /**
     * 关联的用户
     */
    @ManyToOne(() => User, {
        createForeignKeyConstraints: false,
    })
    @JoinColumn({ name: "user_id" })
    user?: User;

    /**
     * 邀请者用户
     */
    @ManyToOne(() => User, {
        createForeignKeyConstraints: false,
    })
    @JoinColumn({ name: "invited_by" })
    inviter?: User;
}
