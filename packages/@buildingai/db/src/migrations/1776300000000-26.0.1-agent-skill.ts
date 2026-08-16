/**
 * Migration: agent skill support
 * Version: agent-skill
 * Generated: 2026-08-14
 *
 * 新增智能体 Skill 体系：
 * 1. 新建 ai_agent_skill 表（元数据 + 引用路径）
 * 2. ai_agent 表新增 skill_ids 列（simple-array，绑定 Skill ID 列表）
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776300000001 implements MigrationInterface {
    name = "Migration1776300000001";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "ai_agent_skill" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "agent_id" uuid NOT NULL,
                "name" character varying(255) NOT NULL,
                "description" text,
                "instructions" text NOT NULL,
                "source_type" character varying(20) NOT NULL,
                "source_ref" text NOT NULL,
                "file_meta" jsonb,
                CONSTRAINT "PK_ai_agent_skill" PRIMARY KEY ("id")
            )`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_ai_agent_skill_agent_id" ON "ai_agent_skill" ("agent_id")`,
        );
        await queryRunner.query(
            `COMMENT ON TABLE "ai_agent_skill" IS '智能体技能：指令+知识型配置，绑定到具体智能体实例'`,
        );

        // ai_agent 表新增 skill_ids 列（simple-array 在 Postgres 中映射为 text）
        await queryRunner.query(
            `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent' AND column_name = 'skill_ids') THEN ALTER TABLE "ai_agent" ADD "skill_ids" text; END IF; END $$`,
        );
        await queryRunner.query(
            `COMMENT ON COLUMN "ai_agent"."skill_ids" IS '关联 Skill ID 列表（逗号分隔）'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent' AND column_name = 'skill_ids') THEN ALTER TABLE "ai_agent" DROP COLUMN "skill_ids"; END IF; END $$`,
        );
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_agent_skill"`);
    }
}
