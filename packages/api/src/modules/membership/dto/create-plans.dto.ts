import { MembershipPlanDuration } from "@buildingai/db/entities";
import {
    IsArray,
    IsEnum,
    IsObject,
    IsOptional,
    IsString,
    registerDecorator,
    ValidationOptions,
} from "class-validator";

interface Duration {
    value: number;
    unit: string;
}

interface Billing {
    levelId: string;
    salesPrice: number;
    originalPrice: number;
    label: string;
    status: boolean;
}

/**
 * 自定义验证器:检查 billing 数组中的 levelId 是否重复
 * @param validationOptions 验证选项
 */
function IsUniqueLevelId(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: "isUniqueLevelId",
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: Billing[]) {
                    if (!Array.isArray(value)) {
                        return true; // 如果不是数组,由 @IsArray 处理
                    }

                    const levelIds = value
                        .map((item: Billing) => item.levelId)
                        .filter((id) => id !== undefined && id !== null);

                    const uniqueLevelIds = new Set(levelIds);
                    return levelIds.length === uniqueLevelIds.size;
                },
                defaultMessage() {
                    return "会员等级ID不能重复";
                },
            },
        });
    };
}

export class CreatePlansDto {
    @IsString({ message: "名称必须为字符串" })
    name: string;

    @IsString({ message: "标签必须为字符串" })
    @IsOptional()
    label?: string;

    @IsEnum(MembershipPlanDuration, {
        message:
            "订阅时长配置必须为 1-月度会员 2-季度会员 3-半年会员 4-年度会员 5-终身会员 6-自定义",
    })
    durationConfig: MembershipPlanDuration;

    @IsObject({ message: "订阅时长必须为对象" })
    @IsOptional()
    duration?: Duration;

    @IsArray({ message: "会员计费必须为数组" })
    @IsUniqueLevelId({ message: "会员等级ID不能重复" })
    @IsOptional()
    billing?: Billing[];
}
