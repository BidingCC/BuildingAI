import { BaseService } from "@buildingai/base";
import { PayConfigPayType } from "@buildingai/constants";
import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { AppBillingService } from "@buildingai/core/modules";
import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import {
    CardBatch,
    CardKeyStatus,
    CDK,
    MembershipOrder,
    UserSubscription,
} from "@buildingai/db/entities";
import { DataSource } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { generateNo } from "@buildingai/utils";
import { calculateMembershipGiftExpireAt } from "@modules/membership/utils/membership-gift-cycle";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, EntityManager, Like, Repository } from "typeorm";

import { QueryCDKDto } from "../dto/query-cdk.dto";
import { RedeemCDKDto } from "../dto/redeem-cdk.dto";

/**
 * 卡密服务
 */
@Injectable()
export class CDKService extends BaseService<CDK> {
    constructor(
        @InjectRepository(CDK)
        private readonly cardKeyRepository: Repository<CDK>,
        @InjectRepository(MembershipOrder)
        private readonly membershipOrderRepository: Repository<MembershipOrder>,
        @InjectDataSource()
        private readonly cardKeyDataSource: DataSource,
        private readonly appBillingService: AppBillingService,
    ) {
        super(cardKeyRepository);
    }

    /**
     * 查询卡密列表
     */
    async queryCDKs(queryDto: QueryCDKDto) {
        const { batchId, keyCode, status, userId, startTime, endTime } = queryDto;

        const where: any = {};

        if (batchId) {
            where.batchId = batchId;
        }

        if (keyCode) {
            where.keyCode = Like(`%${keyCode}%`);
        }

        if (status !== undefined) {
            where.status = status;
        }

        if (userId) {
            where.userId = userId;
        }

        if (startTime && endTime) {
            where.usedAt = Between(startTime, endTime);
        }

        const result = await this.paginate(queryDto, {
            where,
            relations: ["batch", "batch.level", "user"],
            order: { createdAt: "DESC" },
        });

        // 为每个卡密添加格式化的兑换内容
        const itemsWithContent = result.items.map((item) => {
            let redeemContent = "";
            if (item.batch?.redeemType === 1) {
                // 会员类型：会员等级（几月）
                const levelName = item.batch.level?.name || "未知等级";
                let duration = "未知时长";

                if (item.batch.membershipDuration) {
                    switch (item.batch.membershipDuration) {
                        case 1:
                            duration = "1个月";
                            break;
                        case 2:
                            duration = "3个月";
                            break;
                        case 3:
                            duration = "6个月";
                            break;
                        case 4:
                            duration = "1年";
                            break;
                        case 5:
                            duration = "终身";
                            break;
                        case 6:
                            if (item.batch.customDuration) {
                                duration = `${item.batch.customDuration.value}${item.batch.customDuration.unit}`;
                            }
                            break;
                    }
                }

                redeemContent = `${levelName}（${duration}）`;
            } else if (item.batch?.redeemType === 2) {
                // 积分类型
                redeemContent = `${item.batch.pointsAmount || 0}积分`;
            }

            return {
                ...item,
                redeemContent,
            };
        });

        return {
            ...result,
            items: itemsWithContent,
        };
    }

    /**
     * 查询已使用的卡密记录
     */
    async queryUsedCDKs(queryDto: QueryCDKDto) {
        return this.queryCDKs({
            ...queryDto,
            status: CardKeyStatus.USED,
        });
    }

    /**
     * 查询指定批次下的卡密列表（分页）
     */
    async queryBatchCDKs(batchId: string, queryDto: QueryCDKDto) {
        const { keyCode, status, userId, startTime, endTime } = queryDto;

        const where: any = {
            batchId,
            keyCode: keyCode ? Like(`%${keyCode}%`) : undefined,
            status: status !== undefined ? status : undefined,
            userId: userId || undefined,
            usedAt: startTime && endTime ? Between(startTime, endTime) : undefined,
        };

        return this.paginate(queryDto, {
            where,
            relations: ["user"],
            order: {
                createdAt: "DESC",
            },
        });
    }

    /**
     * 兑换卡密
     */
    async redeemCDK(userId: string, redeemDto: RedeemCDKDto) {
        const { keyCode } = redeemDto;

        return this.cardKeyDataSource.transaction(async (entityManager) => {
            // 第一步：查询并锁定卡密
            const cdk = await entityManager.findOne(CDK, {
                where: { keyCode },
                lock: { mode: "pessimistic_write" },
            });

            if (!cdk) {
                throw HttpErrorFactory.notFound("卡密不存在");
            }

            // 第二步：查询批次信息（不需要锁）
            const batch = await entityManager.findOne(CardBatch, {
                where: { id: cdk.batchId },
                relations: ["level"],
            });

            if (!batch) {
                throw HttpErrorFactory.notFound("卡密批次不存在");
            }

            // 检查卡密状态
            if (cdk.status === CardKeyStatus.USED) {
                throw HttpErrorFactory.badRequest("卡密已被使用");
            }

            if (cdk.status === CardKeyStatus.EXPIRED) {
                throw HttpErrorFactory.badRequest("卡密已过期");
            }

            // 检查卡密是否在有效期内
            const now = new Date();
            if (batch.expireAt < now) {
                // 更新卡密状态为已过期
                await entityManager.update(CDK, { id: cdk.id }, { status: CardKeyStatus.EXPIRED });
                throw HttpErrorFactory.badRequest("卡密已过期");
            }

            let redeemResult: any = {};

            // 根据兑换类型处理
            if (batch.redeemType === 1) {
                // 会员类型
                redeemResult = await this.redeemMembership(userId, cdk, batch, entityManager);
            } else if (batch.redeemType === 2) {
                // 积分类型
                redeemResult = await this.redeemPoints(userId, cdk, batch, entityManager);
            }

            // 更新卡密状态
            await entityManager.update(
                CDK,
                { id: cdk.id },
                {
                    status: CardKeyStatus.USED,
                    userId,
                    usedAt: now,
                },
            );

            return {
                success: true,
                message: "兑换成功",
                ...redeemResult,
            };
        });
    }

    /**
     * 兑换积分类型卡密
     */
    private async redeemPoints(userId: string, cdk: CDK, batch: CardBatch, entityManager: any) {
        const pointsAmount = batch.pointsAmount || 0;

        // 使用 AppBillingService 增加积分
        await this.appBillingService.addUserPower(
            {
                userId,
                amount: pointsAmount,
                accountType: ACCOUNT_LOG_TYPE.CARD_KEY_REDEEM_INC,
                source: {
                    type: ACCOUNT_LOG_SOURCE.CARD_KEY_REDEEM,
                    source: "卡密兑换",
                },
                remark: `卡密兑换积分：${pointsAmount}`,
                associationNo: cdk.keyCode,
            },
            entityManager,
        );

        return {
            type: "points",
            points: pointsAmount,
        };
    }

    /**
     * 兑换会员类型卡密
     */
    private async redeemMembership(
        userId: string,
        cdk: CDK,
        batch: CardBatch,
        entityManager: EntityManager,
    ) {
        const now = new Date();
        const targetLevelId = batch.levelId;

        // 按 (userId, levelId) 查找唯一订阅记录
        const existingSubscription = await entityManager.findOne(UserSubscription, {
            where: { userId, levelId: targetLevelId },
            relations: ["level"],
        });

        // 查询用户当前有效的最高等级订阅
        const activeSubscriptions = await entityManager.find(UserSubscription, {
            where: { userId },
            relations: ["level"],
        });
        const validActiveSubscriptions = activeSubscriptions.filter(
            (s) => s.endTime && s.endTime > now,
        );

        // 找最高等级会员
        const currentActiveSubscription = validActiveSubscriptions.sort((a, b) => {
            if (b.level?.level !== a.level?.level) {
                return (b.level?.level || 0) - (a.level?.level || 0);
            }
            return b.endTime.getTime() - a.endTime.getTime();
        })[0];

        const hasActiveSubscription = Boolean(currentActiveSubscription);
        const currentLevelValue = currentActiveSubscription?.level?.level || 0;
        const targetLevelValue = batch.level?.level || 0;

        if (hasActiveSubscription && targetLevelValue < currentLevelValue) {
            throw HttpErrorFactory.badRequest(
                `您当前是${currentActiveSubscription?.level?.name}，无法兑换更低等级的会员`,
            );
        }

        // 是否升级会员
        const shouldUpgradeLevel = !hasActiveSubscription || targetLevelValue > currentLevelValue;

        // 计算起始时间：如果该等级订阅仍有效，从现有结束时间开始顺延
        const startBase =
            existingSubscription && existingSubscription.endTime > now
                ? new Date(existingSubscription.endTime)
                : new Date(now);

        // 计算会员结束时间
        const endTime = this.calculateMembershipEndTime(startBase, batch);

        // 格式化会员时长文本
        let durationText = "";
        switch (batch.membershipDuration) {
            case 1:
                durationText = "1个月";
                break;
            case 2:
                durationText = "3个月";
                break;
            case 3:
                durationText = "6个月";
                break;
            case 4:
                durationText = "1年";
                break;
            case 5:
                durationText = "永久";
                break;
            case 6:
                if (batch.customDuration) {
                    durationText = `${batch.customDuration.value}${batch.customDuration.unit}`;
                } else {
                    durationText = "自定义";
                }
                break;
            default:
                durationText = "未知时长";
        }

        // 创建订单快照
        const levelSnap = JSON.parse(
            JSON.stringify({
                id: batch.level?.id,
                name: batch.level?.name,
                level: batch.level?.level,
                givePower: batch.level?.givePower,
                icon: batch.level?.icon,
                description: batch.level?.description,
                benefits: batch.level?.benefits,
            }),
        );

        // 生成订单号
        const orderNo = await generateNo(this.membershipOrderRepository, "orderNo");

        // 创建卡密兑换订单（source = 2，已支付，金额为0）
        const order = await entityManager.save(MembershipOrder, {
            userId,
            orderNo,
            levelId: targetLevelId,
            planId: "", // 卡密兑换没有套餐
            planSnap: {},
            levelSnap,
            payType: PayConfigPayType.WECHAT, // 占位
            duration: durationText,
            totalAmount: 0,
            orderAmount: 0,
            payState: 1, // 已支付（卡密兑换直接生效）
            status: 1, // 订单完成
            payTime: now,
            refundStatus: 0,
            source: 2, // 卡密兑换
        });

        let subscription: UserSubscription;

        if (existingSubscription) {
            // 更新现有订阅记录
            if (existingSubscription.endTime > now) {
                // 仍有效，顺延
                existingSubscription.endTime = endTime;
            } else {
                // 已过期，重新设置
                existingSubscription.startTime = now;
                existingSubscription.endTime = endTime;
            }
            existingSubscription.orderId = order.id;
            subscription = await entityManager.save(UserSubscription, existingSubscription);
        } else {
            // 创建新订阅记录
            subscription = await entityManager.save(UserSubscription, {
                userId,
                levelId: targetLevelId,
                orderId: order.id,
                startTime: now,
                endTime,
            });
        }

        // 会员赠送积分
        const shouldGiftPoints = !hasActiveSubscription || targetLevelValue > currentLevelValue;

        const givePower = shouldGiftPoints ? batch.level?.givePower || 0 : 0;

        if (givePower > 0) {
            const expireAt = calculateMembershipGiftExpireAt(startBase, subscription.endTime);

            await this.appBillingService.addUserPower(
                {
                    userId,
                    amount: givePower,
                    accountType: ACCOUNT_LOG_TYPE.MEMBERSHIP_GIFT_INC,
                    source: {
                        type: ACCOUNT_LOG_SOURCE.MEMBERSHIP_GIFT,
                        source: "会员周期赠送",
                    },
                    remark: `会员周期赠送临时积分：${givePower}`,
                    associationNo: this.generateMembershipGiftAssociationNo(cdk.keyCode, 0),
                    expireAt,
                    subscriptionId: subscription.id,
                },
                entityManager,
            );
        }

        return {
            type: "membership",
            levelName: batch.level?.name || existingSubscription?.level?.name,
            endTime: endTime.toISOString(),
            giftPoints: givePower,
        };
    }

    /**
     * 计算会员到期时间
     */
    private calculateMembershipEndTime(base: Date, batch: CardBatch): Date {
        const end = new Date(base);

        switch (batch.membershipDuration) {
            case 1: // 月
                end.setMonth(end.getMonth() + 1);
                break;

            case 2: // 季
                end.setMonth(end.getMonth() + 3);
                break;

            case 3: // 半年
                end.setMonth(end.getMonth() + 6);
                break;

            case 4: // 年
                end.setFullYear(end.getFullYear() + 1);
                break;

            case 5: // 终身
                return new Date("9999-12-31T23:59:59.999Z");

            case 6: // 自定义
                if (batch.customDuration) {
                    const { value, unit } = batch.customDuration;

                    if (unit === "天") {
                        end.setDate(end.getDate() + value);
                    }

                    if (unit === "月") {
                        end.setMonth(end.getMonth() + value);
                    }

                    if (unit === "年") {
                        end.setFullYear(end.getFullYear() + value);
                    }
                }
                break;
        }

        return end;
    }

    private generateMembershipGiftAssociationNo(baseNo: string, cycle: number): string {
        return `${baseNo}_${cycle}`;
    }
}
