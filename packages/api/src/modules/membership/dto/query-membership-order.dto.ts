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

    @IsString({ message: "支付方式必须是字符串" })
    @IsOptional()
    payType?: string;

    @IsString({ message: "支付状态必须是字符串" })
    @IsOptional()
    payState?: string;

    @IsString({ message: "退款状态必须是字符串" })
    @IsOptional()
    refundState?: string;
}
