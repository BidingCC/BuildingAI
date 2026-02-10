import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateEmptyDatasetDto {
    @IsString({ message: "知识库名称必须是字符串" })
    @IsNotEmpty({ message: "知识库名称不能为空" })
    name: string;

    @IsOptional()
    @IsString({ message: "知识库描述必须是字符串" })
    description?: string;

    @IsOptional()
    @IsString({ message: "封面图 URL 必须是字符串" })
    coverUrl?: string;
}
