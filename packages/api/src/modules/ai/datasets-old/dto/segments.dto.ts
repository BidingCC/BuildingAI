import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

/**
 * 删除分段 DTO
 */
export class DeleteSegmentDto {
    /**
     * 分段ID
     */
    @IsUUID("4", { message: "分段ID格式不正确" })
    @IsNotEmpty({ message: "分段ID不能为空" })
    id: string;
}

/**
 * 批量删除分段 DTO
 */
export class BatchDeleteSegmentDto {
    /**
     * 知识库ID
     */
    @IsUUID("4", { message: "知识库ID格式不正确" })
    @IsNotEmpty({ message: "知识库ID不能为空" })
    datasetId: string;

    /**
     * 分段ID数组
     */
    @IsArray({ message: "分段ID必须是数组" })
    @IsUUID("4", { each: true, message: "分段ID格式不正确" })
    @IsNotEmpty({ message: "分段ID不能为空" })
    ids: string[];
}

/**
 * 创建分段 DTO
 */
export class CreateSegmentDto {
    /**
     * 知识库ID
     */
    @IsUUID("4", { message: "知识库ID格式不正确" })
    @IsNotEmpty({ message: "知识库ID不能为空" })
    datasetId: string;

    /**
     * 文档ID
     */
    @IsUUID("4", { message: "文档ID格式不正确" })
    @IsNotEmpty({ message: "文档ID不能为空" })
    documentId: string;

    /**
     * 分段内容
     */
    @IsString({ message: "分段内容必须是字符串" })
    @IsNotEmpty({ message: "分段内容不能为空" })
    content: string;

    /**
     * 元数据信息（可选）
     */
    @IsOptional()
    metadata?: Record<string, any>;
}

/**
 * 编辑分段 DTO
 */
export class UpdateSegmentDto {
    /**
     * 分段内容
     */
    @IsString({ message: "分段内容必须是字符串" })
    @IsNotEmpty({ message: "分段内容不能为空" })
    content: string;

    /**
     * 元数据信息（可选）
     */
    @IsOptional()
    metadata?: Record<string, any>;

    /**
     * 知识库ID
     */
    @IsUUID("4", { message: "知识库ID格式不正确" })
    @IsNotEmpty({ message: "知识库ID不能为空" })
    datasetId: string;
}

/**
 * 分段状态枚举
 */
export const SegmentStatus = {
    ALL: "all",
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
};

/**
 * 查询分段 DTO
 */
export class QuerySegmentDto extends PaginationDto {
    /**
     * 文档ID（推荐）
     * 分段属于文档，推荐通过文档ID来查询特定文档的分段
     */
    @IsOptional()
    @IsUUID("4", { message: "文档ID格式不正确" })
    documentId?: string;

    /**
     * 知识库ID（可选）
     * 可用作额外筛选条件，当没有指定文档ID时可用于筛选特定知识库下的所有分段
     */
    @IsOptional()
    @IsUUID("4", { message: "知识库ID格式不正确" })
    datasetId?: string;

    /**
     * 关键词搜索（内容）
     */
    @IsOptional()
    @IsString({ message: "关键词必须是字符串" })
    keyword?: string;

    /**
     * 向量化状态筛选
     */
    @IsOptional()
    @IsEnum(SegmentStatus, { message: "状态必须是有效值" })
    status?: (typeof SegmentStatus)[keyof typeof SegmentStatus];

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
    @IsString({ message: "结束时间必须是字符串" })
    endTime?: string;
}
