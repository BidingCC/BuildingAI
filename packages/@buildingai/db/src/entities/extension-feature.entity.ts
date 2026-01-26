import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne } from "../typeorm";
import { BaseEntity } from "./base";
import { Extension } from "./extension.entity";
import { MembershipLevels } from "./membership-levels.entity";

/**
 * 插件功能实体
 *
 * 用于管理插件功能与会员等级的关联配置
 * 一个功能可以对应多个会员等级
 */
@AppEntity({ name: "extension_feature", comment: "插件功能配置" })
export class ExtensionFeature extends BaseEntity {
    /**
     * 功能唯一标识符
     *
     * 用于在装饰器中标识功能，格式建议：插件标识符:功能名称
     * 例如：blog:create-post, ai-chat:advanced-model
     */
    @Column({
        type: "varchar",
        length: 128,
        unique: true,
        comment: "功能唯一标识符",
    })
    @Index()
    featureCode: string;

    /**
     * 功能名称
     *
     * 用于在管理界面显示
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "功能名称",
    })
    name: string;

    /**
     * 功能描述
     */
    @Column({
        type: "text",
        nullable: true,
        comment: "功能描述",
    })
    description?: string;

    /**
     * 关联的插件ID
     */
    @Column({
        type: "uuid",
        comment: "关联的插件ID",
    })
    @Index()
    extensionId: string;

    /**
     * 关联的插件
     */
    @ManyToOne(() => Extension, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "extension_id" })
    extension: Extension;

    /**
     * 允许访问的会员等级
     *
     * 多对多关系，一个功能可以对应多个会员等级
     * 如果为空，则所有用户都可以访问
     */
    @ManyToMany(() => MembershipLevels)
    @JoinTable({
        name: "extension_feature_membership_levels",
        joinColumn: {
            name: "feature_id",
            referencedColumnName: "id",
        },
        inverseJoinColumn: {
            name: "level_id",
            referencedColumnName: "id",
        },
    })
    membershipLevels: MembershipLevels[];

    /**
     * 功能状态
     *
     * 是否启用该功能的会员限制
     */
    @Column({
        type: "boolean",
        default: true,
        comment: "功能状态",
    })
    status: boolean;
}
