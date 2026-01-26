import "../utils/env";

import { DataSource, DataSourceOptions } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

/**
 * Creates a data source configuration object
 * @param opts Optional configuration options for the typeorm datasource
 */
export const createDataSourceConfig = (
    opts?: Pick<DataSourceOptions, "synchronize" | "logging" | "entities" | "migrations">,
): DataSourceOptions => {
    return {
        type: process.env.DB_TYPE as "postgres",
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_DATABASE || "buildingai",
        synchronize:
            opts?.synchronize !== undefined
                ? opts?.synchronize
                : process.env.NODE_ENV === "development"
                  ? process.env.DB_DEV_SYNCHRONIZE === "true"
                  : process.env.DB_SYNCHRONIZE === "true" || false,
        logging: opts?.logging || process.env.DB_LOGGING === "true",
        namingStrategy: new SnakeNamingStrategy(),
        migrations: opts?.migrations || [],
        migrationsTableName: "migrations_history",
        extra: {
            idleTimeoutMillis: 0,
            connectionTimeoutMillis: 0,
        },
    };
};

export default new DataSource(createDataSourceConfig());
