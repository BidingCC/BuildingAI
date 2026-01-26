import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Analyse, AnalyseActionType } from "@buildingai/db/entities";
import { MoreThanOrEqual, Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

/**
 * 行为分析服务
 *
 * 用于记录和统计用户行为，包括访问、插件使用等
 */
@Injectable()
export class AnalyseService extends BaseService<Analyse> {
    constructor(
        @InjectRepository(Analyse)
        private readonly analyseRepository: Repository<Analyse>,
    ) {
        super(analyseRepository);
    }

    /**
     * 记录页面访问
     *
     * 30分钟内同一用户/IP只记录一次
     *
     * @param userId 用户ID（可为空，支持匿名访问）
     * @param source 访问来源（页面路径）
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @param extraData 额外信息
     * @returns 是否成功记录（true：新记录，false：30分钟内已存在，不重复记录）
     */
    async recordPageVisit(
        userId: string | null | undefined,
        source: string,
        ipAddress?: string | null,
        userAgent?: string | null,
        extraData?: Record<string, any> | null,
    ): Promise<boolean> {
        // 检查30分钟内是否已有记录
        const thirtyMinutesAgo = new Date();
        thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

        const existingRecord = await this.analyseRepository.findOne({
            where: [
                // 有用户ID时，检查同一用户的访问
                userId
                    ? {
                          userId,
                          actionType: AnalyseActionType.PAGE_VISIT,
                          source,
                          createdAt: MoreThanOrEqual(thirtyMinutesAgo),
                      }
                    : null,
                // 无用户ID时，检查同一IP的访问
                !userId && ipAddress
                    ? {
                          userId: null,
                          actionType: AnalyseActionType.PAGE_VISIT,
                          source,
                          ipAddress,
                          createdAt: MoreThanOrEqual(thirtyMinutesAgo),
                      }
                    : null,
            ].filter(Boolean) as any,
            order: { createdAt: "DESC" },
        });

        // 如果30分钟内已有记录，不重复记录
        if (existingRecord) {
            return false;
        }

        // 创建新记录
        await this.analyseRepository.save({
            userId: userId || null,
            actionType: AnalyseActionType.PAGE_VISIT,
            source,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            extraData: extraData || null,
        });

        return true;
    }

    /**
     * 记录插件使用
     *
     * @param userId 用户ID
     * @param extensionName 插件名称
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @param extraData 额外信息
     */
    async recordPluginUse(
        userId: string | null | undefined,
        extensionName: string,
        ipAddress?: string | null,
        userAgent?: string | null,
        extraData?: Record<string, any> | null,
    ): Promise<void> {
        await this.analyseRepository.save({
            userId: userId || null,
            actionType: AnalyseActionType.PLUGIN_USE,
            source: extensionName,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            extraData: extraData || null,
        });
    }

    /**
     * 记录通用行为
     *
     * @param actionType 行为类型
     * @param userId 用户ID
     * @param source 行为来源
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @param extraData 额外信息
     */
    async recordAction(
        actionType: AnalyseActionType,
        userId: string | null | undefined,
        source: string,
        ipAddress?: string | null,
        userAgent?: string | null,
        extraData?: Record<string, any> | null,
    ): Promise<void> {
        await this.analyseRepository.save({
            userId: userId || null,
            actionType,
            source,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            extraData: extraData || null,
        });
    }
}
