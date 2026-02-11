import { TagType, type TagTypeType } from "@buildingai/constants/shared/tag.constant";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, ManyToMany } from "../typeorm";
import { Agent } from "./ai-agent.entity";
import { BaseEntity } from "./base";
import { Datasets } from "./datasets.entity";

/**
 * Tag entity
 *
 * Manages tags used for categorization and labeling of resources
 */
@AppEntity({ name: "tag", comment: "标签管理" })
export class Tag extends BaseEntity {
    /**
     * Tag name
     */
    @Column({ length: 100, comment: "Tag name" })
    name: string;

    /**
     * Tag type
     */
    @Column({
        type: "varchar",
        length: 50,
        default: TagType.APP,
        comment: "Tag type: app - application tag",
    })
    type: TagTypeType;

    /**
     * Binding count
     *
     * Records how many times this tag is used
     */
    @Column({ type: "int", default: 0, comment: "Binding count" })
    bindingCount: number;

    /**
     * Check whether the tag is an application tag
     *
     * @returns Whether it is an application tag
     */
    isAppTag(): boolean {
        return this.type === TagType.APP;
    }

    isDatasetTag(): boolean {
        return this.type === TagType.DATASET;
    }

    /**
     * Increase binding count
     *
     * @param count Increment value, default 1
     */
    incrementBindingCount(count: number = 1): void {
        this.bindingCount += count;
    }

    /**
     * Decrease binding count
     *
     * @param count Decrement value, default 1
     */
    decrementBindingCount(count: number = 1): void {
        this.bindingCount = Math.max(0, this.bindingCount - count);
    }

    /**
     * Reset binding count
     */
    resetBindingCount(): void {
        this.bindingCount = 0;
    }

    /**
     * Check whether there are any bindings
     *
     * @returns Whether the binding count is greater than zero
     */
    hasBindings(): boolean {
        return this.bindingCount > 0;
    }

    /**
     * 关联的智能体（仅当 type='app' 时有效）
     *
     * 多对多关系的反向，一个标签可以关联多个智能体，一个智能体可以有多个标签
     */
    @ManyToMany(() => Agent, (agent) => agent.tags)
    agents?: Agent[];

    @ManyToMany(() => Datasets, (dataset) => dataset.tags)
    datasets?: Datasets[];
}
