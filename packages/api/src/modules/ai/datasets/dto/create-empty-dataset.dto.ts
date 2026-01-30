import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * 创建空知识库 DTO（Web 端创建知识库）
 *
 * 向量模型 ID 与检索设置从 config 字典表（group: datasets_config）读取，不由前端传入。
 */
export class CreateEmptyDatasetDto {
    /**
     * 知识库名称
     */
    @IsString({ message: "知识库名称必须是字符串" })
    @IsNotEmpty({ message: "知识库名称不能为空" })
    name: string;

    /**
     * 知识库描述
     */
    @IsOptional()
    @IsString({ message: "知识库描述必须是字符串" })
    description?: string;
}
