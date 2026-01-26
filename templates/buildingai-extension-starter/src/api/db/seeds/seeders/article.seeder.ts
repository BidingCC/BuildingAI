import { BaseSeeder } from "@buildingai/db";
import { User } from "@buildingai/db/entities";
import { DataSource } from "@buildingai/db/typeorm";
import * as path from "path";

import { Article, ArticleStatus } from "../../entities/article.entity";
import { Category } from "../../entities/category.entity";

/**
 * Blog article seeder
 *
 * Initialize default blog articles
 */
export class ArticleSeeder extends BaseSeeder {
    readonly name = "ArticleSeeder";
    readonly priority = 110; // Run after CategorySeeder (priority 100)

    /**
     * Override getConfigPath to use extension-relative paths
     */
    protected getConfigPath(fileName: string): string {
        // In compiled extension: __dirname is build/db/seeds/seeders/
        // Data files are in build/db/seeds/data/
        return path.join(__dirname, "../data", fileName);
    }

    /**
     * Check if seeder should run
     */
    async shouldRun(dataSource: DataSource): Promise<boolean> {
        const repository = dataSource.getRepository(Article);
        const count = await repository.count();

        // Only run if no articles exist
        return count === 0;
    }

    /**
     * Run seeder
     */
    async run(dataSource: DataSource): Promise<void> {
        const articleRepository = dataSource.getRepository(Article);
        const categoryRepository = dataSource.getRepository(Category);
        const userRepository = dataSource.getRepository(User);

        // Get first user as author (optional)
        const users = await userRepository.find({
            order: { createdAt: "ASC" },
            take: 1,
        });
        const firstUser = users[0];

        if (!firstUser) {
            this.logWarn("No user found, articles will be created without author (anonymous)");
        }

        // Load default articles from data file
        const articles = await this.loadConfig<
            Array<{
                title: string;
                summary?: string;
                content: string;
                cover?: string;
                status?: "draft" | "published";
                categoryName?: string;
                sort?: number;
                viewCount?: number;
            }>
        >("blog-articles.json");

        this.logInfo(`Preparing to insert ${articles.length} blog articles`);

        // Get all categories for name matching
        const categories = await categoryRepository.find();
        const categoryMap = new Map(categories.map((cat) => [cat.name, cat]));

        for (const articleData of articles) {
            // Find category by name
            let categoryId: string | undefined;
            if (articleData.categoryName) {
                const category = categoryMap.get(articleData.categoryName);
                if (category) {
                    categoryId = category.id;
                } else {
                    this.logWarn(
                        `Category "${articleData.categoryName}" not found for article "${articleData.title}"`,
                    );
                }
            }

            // Determine status
            const status =
                articleData.status === "published" ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT;

            // Set publishedAt if published
            const publishedAt = status === ArticleStatus.PUBLISHED ? new Date() : undefined;

            const article = articleRepository.create({
                title: articleData.title,
                summary: articleData.summary ?? undefined,
                content: articleData.content,
                cover: articleData.cover ?? undefined,
                status,
                categoryId,
                sort: articleData.sort ?? 0,
                viewCount: articleData.viewCount ?? 0,
                publishedAt,
                author: firstUser ?? undefined,
            });

            await articleRepository.save(article);
            this.logInfo(`Inserted article: ${article.title}`);
        }

        this.logSuccess(`Successfully inserted ${articles.length} blog articles`);
    }
}
