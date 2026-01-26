import { DataSource } from "@buildingai/db/typeorm";
import { Logger } from "@nestjs/common";

/**
 * Extension upgrade script for version 0.0.2
 *
 * Example upgrade logic for buildingai-simple-blog extension
 */
export class Upgrade {
    private readonly logger = new Logger(Upgrade.name);

    constructor(private readonly dataSource: DataSource) {}

    /**
     * Execute upgrade logic
     */
    async execute(): Promise<void> {
        this.logger.log("Starting upgrade to version 0.0.2");

        // Example: Query user table data
        await this.queryUserData();

        // Example: Update existing data
        // await this.updateArticleStatus();

        // Example: Initialize new features
        // await this.initializeNewFeature();

        this.logger.log("Upgrade to version 0.0.2 completed");
    }

    /**
     * Example: Query user table data
     */
    private async queryUserData(): Promise<void> {
        this.logger.log("Querying user table data...");

        const users = await this.dataSource.query(`
            SELECT id, username, nickname, email, created_at 
            FROM "user" 
            LIMIT 10
        `);

        console.log(`Found ${users.length} users`);
        users.forEach((user) => {
            console.log(`User: ${user.username} (${user.nickname})`);
        });

        console.log("User data query completed");
    }
}
