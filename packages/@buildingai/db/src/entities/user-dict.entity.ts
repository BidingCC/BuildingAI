import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne } from "../typeorm";
import { BaseEntity } from "./base";
import { User } from "./user.entity";

/**
 * User Dictionary Configuration Entity
 *
 * Stores user-specific configuration key-value pairs
 */
@AppEntity({ name: "user_config", comment: "用户个人配置字典" })
@Index("UQ_user_dict_user_key_group", ["userId", "key", "group"], { unique: true })
export class UserDict extends BaseEntity {
    /**
     * User ID
     */
    @Column({ type: "uuid", comment: "用户ID" })
    @Index()
    userId: string;

    /**
     * User relation (cascade delete when user is deleted)
     */
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "user_id" })
    user: User;

    /**
     * Configuration key
     */
    @Column({ length: 100, comment: "配置键" })
    key: string;

    /**
     * Configuration value (JSONB format for better query performance)
     */
    @Column({ type: "jsonb", comment: "配置值(JSONB格式)" })
    value: any;

    /**
     * Configuration group
     */
    @Column({ length: 50, default: "default", comment: "配置分组" })
    group: string;

    /**
     * Configuration description
     */
    @Column({ length: 255, nullable: true, comment: "配置描述" })
    description: string;
}
