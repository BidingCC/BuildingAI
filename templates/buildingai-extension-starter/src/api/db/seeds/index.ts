import { BaseSeeder } from "@buildingai/db";

import { ArticleSeeder } from "./seeders/article.seeder";
import { CategorySeeder } from "./seeders/category.seeder";

/**
 * Extension seed entry
 *
 * Must export getSeeders function to return all seeders
 */
export async function getSeeders(): Promise<BaseSeeder[]> {
    return [new CategorySeeder(), new ArticleSeeder()];
}
