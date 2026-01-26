import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class QueryPlansDto extends PaginationDto {
    /**
     * 套餐 Id
     */
    @IsString({ message: "套餐 Id 必须是字符串" })
    @IsOptional()
    id?: string;

    /**
     * 套餐名称
     */
    @IsString({ message: "套餐名称必须是字符串" })
    @IsOptional()
    name?: string;

    /**
     * 套餐状态
     */
    @IsBoolean({ message: "套餐状态必须是布尔值" })
    @IsOptional()
    status?: boolean;
}
