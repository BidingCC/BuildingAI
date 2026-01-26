import { BaseSeeder } from "@buildingai/db";
import { DataSource } from "@buildingai/db/typeorm";
import * as path from "path";

import { Category } from "../../entities/category.entity";

/**
 * Blog category seeder
 *
 * Initialize default blog categories
 */
export class CategorySeeder extends BaseSeeder {
    readonly name = "CategorySeeder";
    readonly priority = 100;

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
        const repository = dataSource.getRepository(Category);
        const count = await repository.count();

        // Only run if no categories exist
        return count === 0;
    }

    /**
     * Run seeder
     */
    async run(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(Category);

        // Load default categories from data file
        const categories = await this.loadConfig<
            Array<{
                name: string;
                description?: string;
                sort?: number;
                articleCount?: number;
            }>
        >("blog-categories.json");

        this.logInfo(`Preparing to insert ${categories.length} blog categories`);

        for (const categoryData of categories) {
            const category = repository.create({
                name: categoryData.name,
                description: categoryData.description ?? undefined,
                sort: categoryData.sort ?? 0,
                articleCount: categoryData.articleCount ?? 0,
            });

            await repository.save(category);
            this.logInfo(`Inserted category: ${category.name}`);
        }

        this.logSuccess(`Successfully inserted ${categories.length} blog categories`);
    }
}
