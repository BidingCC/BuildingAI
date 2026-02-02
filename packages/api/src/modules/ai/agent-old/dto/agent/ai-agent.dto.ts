import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

/**
 * 查询公开智能体DTO
 */
export class QueryPublicAgentDto extends PaginationDto {
    /**
     * 搜索关键词（名称、描述）
     */
    @IsOptional()
    @IsString({ message: "搜索关键词必须是字符串" })
    keyword?: string;

    /**
     * 排序方式
     */
    @IsOptional()
    @IsString({ message: "排序方式必须是字符串" })
    @IsIn(["latest", "popular"], {
        message: "排序方式只能是 latest 或 popular",
    })
    sortBy?: "latest" | "popular";

    /**
     * 是否只显示已发布的智能体
     */
    @IsOptional()
    @Transform(({ value }) => {
        if (value === "true" || value === true) return true;
        if (value === "false" || value === false) return false;
        return undefined;
    })
    @IsBoolean({ message: "发布状态必须是布尔值" })
    publishedOnly?: boolean;

    /**
     * 标签筛选（多个标签ID，逗号分隔或数组）
     * 示例：tagIds=uuid1,uuid2
     */
    @IsOptional()
    @Transform(({ value }) => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string")
            return value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean);
        return undefined;
    })
    @IsArray({ message: "标签ID必须为数组或逗号分隔的字符串" })
    tagIds?: string[];
}
