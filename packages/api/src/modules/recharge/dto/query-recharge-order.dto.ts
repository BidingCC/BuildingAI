import { type PayConfigType } from "@buildingai/constants/shared/payconfig.constant";
import {
    type PayStatusType,
    type RefundStatusType,
} from "@buildingai/constants/shared/payconfig.constant";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { IsOptional, IsString } from "class-validator";
/**
 * 查询充值订单DTO
 */
export class QueryRechargeOrderDto extends PaginationDto {
    /**
     * 订单号
     */
    @IsString()
    @IsOptional()
    orderNo?: string;

    /**
     * 关键词搜索
     */
    @IsString()
    @IsOptional()
    keyword?: string;

    /**
     * 支付类型
     */
    // @IsEnum(PayConfigPayType)
    @IsOptional()
    payType?: PayConfigType;

    /**
     * 支付状态
     */
    @IsOptional()
    payStatus?: PayStatusType;

    /**
     * 退款状态
     */
    @IsOptional()
    refundStatus?: RefundStatusType;
}
