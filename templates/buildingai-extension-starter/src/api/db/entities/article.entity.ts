import { ExtensionEntity } from "@buildingai/core/decorators";
import { User } from "@buildingai/db/entities";
import {
    Column,
    CreateDateColumn,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

import { Category } from "./category.entity";

/**
 * Article status enum
 */
export enum ArticleStatus {
    /**
     * Draft
     */
    DRAFT = "draft",
    /**
     * Published
     */
    PUBLISHED = "published",
}

/**
 * Article entity
 *
 * Manages blog articles
 */
@ExtensionEntity()
export class Article {
    /**
     * Article ID
     */
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * Article title
     */
    @Column({ length: 200, comment: "Article title" })
    title: string;

    /**
     * Article summary
     */
    @Column({ type: "text", nullable: true, comment: "Article summary" })
    summary?: string;

    /**
     * Article content
     */
    @Column({ type: "text", comment: "Article content" })
    content: string;

    /**
     * Cover image URL
     */
    @Column({ length: 500, nullable: true, comment: "Cover image URL" })
    cover?: string;

    /**
     * Article status
     */
    @Column({
        type: "varchar",
        length: 20,
        default: ArticleStatus.DRAFT,
        comment: "Article status: draft, published",
    })
    status: ArticleStatus;

    /**
     * View count
     */
    @Column({ type: "int", default: 0, comment: "View count" })
    viewCount: number;

    /**
     * Sort order
     */
    @Column({ type: "int", default: 0, comment: "Sort order, larger values appear first" })
    sort: number;

    /**
     * Category ID
     */
    @Column({ type: "uuid", nullable: true, comment: "Category ID" })
    categoryId?: string;

    /**
     * Published time
     */
    @Column({ type: "timestamp", nullable: true, comment: "Published time" })
    publishedAt?: Date;

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
     * Category relation
     */
    @ManyToOne(() => Category, (category) => category.articles)
    @JoinColumn({ name: "categoryId" })
    category?: Category;

    /**
     * Author relation
     */
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "authorId" })
    author?: User;

    /**
     * Check if article is published
     *
     * @returns Whether the article is published
     */
    isPublished(): boolean {
        return this.status === ArticleStatus.PUBLISHED;
    }

    /**
     * Check if article is draft
     *
     * @returns Whether the article is draft
     */
    isDraft(): boolean {
        return this.status === ArticleStatus.DRAFT;
    }

    /**
     * Increment view count
     *
     * @param count Increment value, default 1
     */
    incrementViewCount(count: number = 1): void {
        this.viewCount += count;
    }

    /**
     * Publish article
     */
    publish(): void {
        this.status = ArticleStatus.PUBLISHED;
        if (!this.publishedAt) {
            this.publishedAt = new Date();
        }
    }

    /**
     * Unpublish article (revert to draft)
     */
    unpublish(): void {
        this.status = ArticleStatus.DRAFT;
    }
}
