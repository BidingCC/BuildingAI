import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { IsOptional, IsUUID } from "class-validator";

/**
 * 用户端订单列表查询 DTO
 */
export class QueryUserOrderListsDto extends PaginationDto {
    /**
     * 会员等级 ID，传入时只返回该等级的订单
     */
    @IsOptional()
    @IsUUID("4", { message: "等级 ID 格式错误" })
    levelId?: string;
}
