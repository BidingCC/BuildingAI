import { type PayConfigType } from "@buildingai/constants/shared/payconfig.constant";
import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";

/**
 * 提交会员订单 DTO
 */
export class SubmitMembershipOrderDto {
    /**
     * 套餐ID
     */
    @IsNotEmpty({ message: "套餐ID不能为空" })
    @IsUUID("4", { message: "套餐ID格式错误" })
    planId: string;

    /**
     * 等级ID
     */
    @IsNotEmpty({ message: "等级ID不能为空" })
    @IsUUID("4", { message: "等级ID格式错误" })
    levelId: string;

    /**
     * 支付类型
     */
    @IsNotEmpty({ message: "支付类型不能为空" })
    @IsEnum([1, 2, 3], { message: "支付类型错误" })
    payType: PayConfigType;
}
