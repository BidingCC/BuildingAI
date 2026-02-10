import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { IndexingSegmentsDto } from "./indexing-segments.dto";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { Transform, Type } from "class-transformer";
import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from "class-validator";

/**
 * 创建文档 DTO
 * 支持单个或多个文件创建文档，每个文件将创建一个独立的文档记录
 */
export class CreateDocumentDto {
    /**
     * 知识库ID
     */
    @IsString({ message: "知识库ID必须是字符串" })
    @IsUUID(4, { message: "知识库ID格式不正确" })
    @IsNotEmpty({ message: "知识库ID不能为空" })
    datasetId: string;

    /**
     * 文档名称（可选）
     * 如果不提供，将使用文件原始名称
     * 如果提供且有多个文件，仅第一个文件使用此名称，其他文件使用原始名称
     */
    @IsOptional()
    @IsString({ message: "文档名称必须是字符串" })
    documentName?: string;

    /**
     * 向量模型ID
     */
    @IsUUID()
    @IsNotEmpty({ message: "向量模型ID不能为空" })
    embeddingModelId?: string;

    /**
     * 索引配置
     * 其中 fileIds 可以包含多个文件ID，每个文件将创建独立的文档
     */
    @ValidateNested()
    @Type(() => IndexingSegmentsDto)
    indexingConfig: IndexingSegmentsDto;
}

/**
 * 删除文档 DTO
 */
export class DeleteDocumentDto {
    /**
     * 文档ID
     */
    @IsUUID("4", { message: "文档ID格式不正确" })
    @IsNotEmpty({ message: "文档ID不能为空" })
    id: string;
}

/**
 * 重命名文档 DTO
 */
export class RenameDocumentDto {
    /**
     * 新文件名
     */
    @IsString({ message: "文件名必须是字符串" })
    @IsNotEmpty({ message: "文件名不能为空" })
    fileName: string;

    /**
     * 知识库ID
     */
    @IsString({ message: "知识库ID必须是字符串" })
    @IsUUID(4, { message: "知识库ID格式不正确" })
    @IsNotEmpty({ message: "知识库ID不能为空" })
    datasetId: string;
}

/**
 * 查询文档 DTO
 */
export class QueryDocumentDto extends PaginationDto {
    /**
     * 知识库ID
     */
    @IsOptional()
    @IsUUID("4", { message: "知识库ID格式不正确" })
    datasetId?: string;

    /**
     * 关键词搜索（文件名）
     */
    @IsOptional()
    @IsString({ message: "关键词必须是字符串" })
    keyword?: string;

    /**
     * 文件类型筛选
     */
    @IsOptional()
    @IsString({ message: "文件类型必须是字符串" })
    fileType?: string;

    /**
     * 状态筛选
     */
    @IsOptional()
    @IsEnum(PROCESSING_STATUS, { message: "状态必须是有效值" })
    status?: string;

    /**
     * 开始时间
     */
    @IsOptional()
    @IsString({ message: "开始时间必须是字符串" })
    startTime?: string;

    /**
     * 结束时间
     */
    @IsOptional()
    @IsString({ message: "开始时间必须是字符串" })
    endTime?: string;

    /**
     * 文件ID列表筛选（支持逗号分隔的字符串或数组）
     */
    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === "string") {
            return value.split(",").filter((id) => id.trim());
        }
        return value;
    })
    @IsArray({ message: "文件ID列表必须是数组" })
    @IsString({ each: true, message: "文件ID必须是字符串" })
    fileIds?: string[];
}
