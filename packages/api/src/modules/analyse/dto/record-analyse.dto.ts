import { AnalyseActionType } from "@buildingai/db/entities";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * 记录行为分析DTO
 *
 * 统一的接口，支持记录所有类型的行为
 */
export class RecordAnalyseDto {
    /**
     * 行为类型
     */
    @IsEnum(AnalyseActionType, { message: "行为类型必须是有效的枚举值" })
    @IsNotEmpty({ message: "行为类型不能为空" })
    actionType: AnalyseActionType;

    /**
     * 行为来源/标识
     *
     * 根据 actionType 不同，含义不同：
     * - PAGE_VISIT: 页面路径（如 /console/dashboard）
     * - PLUGIN_USE: 插件名称
     * - API_CALL: API路径
     * - OTHER: 其他行为标识
     */
    @IsString({ message: "行为来源必须是字符串" })
    @IsNotEmpty({ message: "行为来源不能为空" })
    source: string;

    /**
     * 额外信息（可选）
     */
    @IsOptional()
    extraData?: Record<string, any>;
}
