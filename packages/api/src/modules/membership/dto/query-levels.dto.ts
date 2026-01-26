import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

/**
 * 查询菜单DTO
 */
export class QueryLevelsDto extends PaginationDto {
    /**
     * 等级名称
     */
    @IsString({ message: "等级名称必须是字符串" })
    @IsOptional()
    name?: string;

    /**
     * 等级状态
     */
    @IsBoolean({ message: "等级状态必须是布尔值" })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === "") {
            return undefined; // 不传或空字符串 → 查询全部
        }

        return value === "true"; // 只接受 true/false
    })
    status?: boolean;
}
