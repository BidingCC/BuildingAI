import { BaseService } from "@buildingai/base";
import { USER_TERMINAL_TYPE_DESCRIPTION } from "@buildingai/constants/shared/status-codes.constant";
import { SignRecord, User } from "@buildingai/db/entities";
import { QuerySignRecordDto } from "@modules/award/dto/query-sign-record.dto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

@Injectable()
export class AwardRecordService extends BaseService<SignRecord> {
    constructor(
        @InjectRepository(SignRecord) repository: Repository<SignRecord>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {
        super(repository);
    }

    /**
     * 查询签到记录
     * @param querySignRecordDto
     * @returns
     */
    async signRecords(querySignRecordDto: QuerySignRecordDto) {
        const { keyword, startTime, endTime } = querySignRecordDto;
        const queryBuilder = this.repository
            .createQueryBuilder("signRecord")
            .leftJoin(User, "user", "user.id = signRecord.userId")
            .select([
                "signRecord.id",
                "signRecord.userId",
                "signRecord.signTime",
                "signRecord.signDate",
                "signRecord.signAward",
                "signRecord.terminal",
            ]);

        if (keyword) {
            queryBuilder.andWhere(
                "(user.username ILIKE :keyword OR user.nickname ILIKE :keyword OR user.phone ILIKE :keyword OR user.userNo ILIKE :keyword)",
                { keyword: `%${keyword}%` },
            );
        }

        if (startTime && endTime) {
            queryBuilder.andWhere("signRecord.signTime BETWEEN :startTime AND :endTime", {
                startTime,
                endTime,
            });
        }

        queryBuilder.orderBy("signRecord.signTime", "DESC").addOrderBy("signRecord.id", "DESC");

        const paginationResult = await this.paginateQueryBuilder(queryBuilder, querySignRecordDto);
        const userIds = [
            ...new Set(paginationResult.items.map((item) => item.userId).filter(Boolean)),
        ];
        const users = userIds.length
            ? await this.userRepository.find({
                  where: { id: In(userIds) },
                  select: ["id", "userNo", "avatar", "username", "nickname", "phone"],
              })
            : [];
        const userMap = new Map(users.map((item) => [item.id, item]));
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(24, 0, 0, 0);
        const [todaySignCountRaw, todaySignAwardRaw, totalSignAwardRaw] = await Promise.all([
            this.repository
                .createQueryBuilder("signRecord")
                .select("COUNT(DISTINCT signRecord.userId)", "count")
                .where("signRecord.signTime BETWEEN :start AND :end", { start, end })
                .getRawOne<{ count: string }>(),
            this.repository
                .createQueryBuilder("signRecord")
                .select("COALESCE(SUM(signRecord.signAward), 0)", "total")
                .where("signRecord.signTime BETWEEN :start AND :end", { start, end })
                .getRawOne<{ total: string }>(),
            this.repository
                .createQueryBuilder("signRecord")
                .select("COALESCE(SUM(signRecord.signAward), 0)", "total")
                .getRawOne<{ total: string }>(),
        ]);

        return {
            ...paginationResult,
            extend: {
                todaySignCount: Number(todaySignCountRaw?.count ?? 0),
                todaySignAward: Number(todaySignAwardRaw?.total ?? 0),
                totalSignAward: Number(totalSignAwardRaw?.total ?? 0),
            },
            items: paginationResult.items.map((item) => ({
                ...item,
                user: userMap.get(item.userId) ?? null,
                terminalDesc: USER_TERMINAL_TYPE_DESCRIPTION[item.terminal],
            })),
        };
    }
}
