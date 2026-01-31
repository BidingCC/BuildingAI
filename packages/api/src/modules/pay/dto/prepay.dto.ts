import {
    PayConfigPayType,
    type PayConfigType,
} from "@buildingai/constants/shared/payconfig.constant";
import {
    UserTerminal,
    type UserTerminalType,
} from "@buildingai/constants/shared/status-codes.constant";
import { PayFrom, type PayFromValue } from "@common/interfaces/pay.interface";
import { IsEnum, IsString } from "class-validator";

/**
 * 预支付DTO
 */
export class PrepayDto {
    /**
     * 终端类型
     */
    @IsEnum(UserTerminal, { message: "终端类型错误" })
    scene: UserTerminalType;
    /**
     * 订单号
     */
    @IsString({ message: "订单号不能为空" })
    orderId?: string;

    /**
     * 支付类型
     */
    @IsEnum(PayConfigPayType, { message: "支付类型错误" })
    payType?: PayConfigType;

    /**
     * 支付来源
     */
    @IsEnum(PayFrom, { message: "订单来源错误" })
    from: PayFromValue;
}
