import { type PayConfigType } from "@buildingai/constants/shared/payconfig.constant";
import {
    type PayStatusType,
    type RefundStatusType,
} from "@buildingai/constants/shared/payconfig.constant";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { IsOptional, IsString } from "class-validator";

export class QueryMembershipOrderDto extends PaginationDto {
    @IsString({ message: "订单号必须是字符串" })
    @IsOptional()
    orderNo?: string;

    @IsString({ message: "用户关键词必须是字符串" })
    @IsOptional()
    userKeyword?: string;

    @IsString({ message: "开始时间必须是字符串" })
    @IsOptional()
    startTime?: string;

    @IsString({ message: "结束时间必须是字符串" })
    @IsOptional()
    endTime?: string;

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
