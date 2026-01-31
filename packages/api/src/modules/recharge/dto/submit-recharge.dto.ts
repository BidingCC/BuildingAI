import {
    PayConfigPayType,
    type PayConfigType,
} from "@buildingai/constants/shared/payconfig.constant";
import {
    UserTerminal,
    type UserTerminalType,
} from "@buildingai/constants/shared/status-codes.constant";
import { IsDefined, IsEnum, IsUUID } from "class-validator";

/**
 * 提交充值订单 DTO（均为必填）
 */
export class SubmitRechargeDto {
    /**
     * 充值套餐 id
     */
    @IsDefined({ message: "充值套餐 id 不能为空" })
    @IsUUID(undefined, { message: "充值套餐 id 格式错误" })
    id: string;

    /**
     * 支付类型
     */
    @IsDefined({ message: "支付类型不能为空" })
    @IsEnum(PayConfigPayType, { message: "支付类型错误" })
    payType: PayConfigType;

    /**
     * 终端类型
     */
    @IsDefined({ message: "终端类型不能为空" })
    @IsEnum(UserTerminal, { message: "终端类型错误" })
    scene: UserTerminalType;
}
