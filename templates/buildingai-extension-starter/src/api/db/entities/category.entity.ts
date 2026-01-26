import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

import { Article } from "./article.entity";

/**
 * Category entity
 *
 * Manages article categories
 */
@ExtensionEntity()
export class Category {
    /**
     * Category ID
     */
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * Category name
     */
    @Column({ length: 100, comment: "Category name" })
    name: string;

    /**
     * Category description
     */
    @Column({ type: "text", nullable: true, comment: "Category description" })
    description?: string;

    /**
     * Sort order
     */
    @Column({ type: "int", default: 0, comment: "Sort order, larger values appear first" })
    sort: number;

    /**
     * Article count
     */
    @Column({ type: "int", default: 0, comment: "Number of articles in this category" })
    articleCount: number;

    /**
     * Created time
     */
    @CreateDateColumn({ comment: "Created time" })
    createdAt: Date;

    /**
     * Updated time
     */
    @UpdateDateColumn({ comment: "Updated time" })
    updatedAt: Date;

    /**
     * Articles in this category
     */
    @OneToMany(() => Article, (article) => article.category)
    articles?: Article[];

    /**
     * Increment article count
     *
     * @param count Increment value, default 1
     */
    incrementArticleCount(count: number = 1): void {
        this.articleCount += count;
    }

    /**
     * Decrement article count
     *
     * @param count Decrement value, default 1
     */
    decrementArticleCount(count: number = 1): void {
        this.articleCount = Math.max(0, this.articleCount - count);
    }

    /**
     * Check if category has articles
     *
     * @returns Whether the category has articles
     */
    hasArticles(): boolean {
        return this.articleCount > 0;
    }
}
