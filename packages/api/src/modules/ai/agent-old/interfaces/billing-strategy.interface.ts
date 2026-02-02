import { type UserPlayground } from "@buildingai/db";
import { User } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";

import { UserUtil } from "../utils/user.util";

export interface BillingResult {
    billToUser: User | null;
    billingContext: string;
}

export interface BillingStrategy {
    determineBillTo(
        agent: Agent,
        user: UserPlayground,
        userRepository: Repository<User>,
    ): Promise<BillingResult>;
}

const isAnonymousUser = (user: UserPlayground): boolean => UserUtil.isAnonymousUser(user);

export class NoBillingStrategy implements BillingStrategy {
    async determineBillTo(): Promise<BillingResult> {
        return { billToUser: null, billingContext: "编排模式" };
    }
}

/**
 * 扣用户费用策略 - 根据用户类型智能决定
 * 匿名用户扣分享者钱，真实用户扣用户钱
 */
export class SmartUserBillingStrategy implements BillingStrategy {
    async determineBillTo(
        agent: Agent,
        user: UserPlayground,
        userRepository: Repository<User>,
    ): Promise<BillingResult> {
        const userId = isAnonymousUser(user) ? agent.createBy : user.id;
        const billToUser = await userRepository.findOne({
            where: { id: userId },
        });
        if (!billToUser) {
            throw new Error(`用户不存在 (ID: ${userId})`);
        }
        return {
            billToUser,
            billingContext: isAnonymousUser(user) ? "分享者积分" : "您的积分",
        };
    }
}

/**
 * 只扣用户费用策略 - 无论什么情况都扣当前用户的钱
 */
export class UserBillingStrategy implements BillingStrategy {
    async determineBillTo(
        agent: Agent,
        user: UserPlayground,
        userRepository: Repository<User>,
    ): Promise<BillingResult> {
        if (isAnonymousUser(user)) {
            throw new Error("请先登录");
        }
        const billToUser = await userRepository.findOne({
            where: { id: user.id },
        });
        if (!billToUser) {
            throw new Error(`用户不存在 (ID: ${user.id})`);
        }
        return { billToUser, billingContext: "您的积分" };
    }
}

/**
 * 扣创建者费用策略 - 无论什么情况都扣创建者的钱
 */
export class CreatorBillingStrategy implements BillingStrategy {
    async determineBillTo(
        agent: Agent,
        user: UserPlayground,
        userRepository: Repository<User>,
    ): Promise<BillingResult> {
        const billToUser = await userRepository.findOne({
            where: { id: agent.createBy },
        });
        if (!billToUser) {
            throw new Error(`智能体创建者用户不存在 (ID: ${agent.createBy})`);
        }
        return { billToUser, billingContext: "创建者积分" };
    }
}
