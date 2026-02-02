import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateDatasetDto {
    @IsOptional()
    @IsString({ message: "知识库名称必须是字符串" })
    @MaxLength(255, { message: "知识库名称不能超过 255 个字符" })
    name?: string;

    @IsOptional()
    @IsString({ message: "知识库描述必须是字符串" })
    description?: string;

    @IsOptional()
    @IsString({ message: "封面图 URL 必须是字符串" })
    coverUrl?: string;
}
