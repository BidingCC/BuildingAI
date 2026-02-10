import type { OrderParams } from "@buildingai/services/webapi/recharge-center";
import type { OrderInfo } from "@buildingai/services/webapi/recharge-center";
/**
 * Submit recharge order
 * @description Submit a recharge order with selected rule and payment method
 * @param data Order parameters
 * @returns Promise with order information
 */
export const apiPostRecharge = (data: OrderParams): Promise<OrderInfo> => {
    return useWebPost("/recharge/submitRecharge", data);
};
