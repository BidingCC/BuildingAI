import {
    Merchant,
    type MerchantType,
    PayConfigInfo,
    PayConfigPayType,
    type PayConfigType,
    PayVersion,
    type PayVersionType,
} from "@buildingai/constants/shared/payconfig.constant";
import { plainToInstance } from "class-transformer";
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Validate,
    validateSync,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from "class-validator";
import { IsIn } from "class-validator";

export class WeChatPayConfigDto {
    /**
     * 支付版本
     * 必填字段，支持V2和V3版本
     * V2: 旧版本支付接口
     * V3: 新版本支付接口
     */
    @IsNotEmpty()
    @IsString()
    @IsIn([PayVersion.V2, PayVersion.V3], {
        message: "支付版本参数错误",
    })
    payVersion: PayVersionType;

    /**
     * 商户类型
     * 必填字段，标识商户类型
     * ordinary: 普通商户
     * child: 子商户
     */
    @IsNotEmpty()
    @IsString()
    @IsIn([Merchant.ORDINARY, Merchant.CHILD], {
        message: "商户类型参数错误",
    })
    merchantType: MerchantType;

    /**
     * 商户号
     */
    @IsNotEmpty()
    @IsString()
    mchId: string;

    /**
     * 商户api密钥
     */
    @IsNotEmpty()
    @IsString()
    apiKey: string;

    /**
     * 微信支付密钥
     */
    @IsNotEmpty()
    @IsString()
    paySignKey: string;

    /**
     * 微信支付证书
     */
    @IsNotEmpty()
    @IsString()
    cert: string;

    /**
     * appid
     */
    @IsNotEmpty()
    @IsString()
    appId: string;
}

export class AlipayConfigDto {
    @IsNotEmpty()
    @IsString()
    appId: string;

    @IsNotEmpty()
    @IsString()
    privateKey: string;

    @IsOptional()
    @IsString()
    gateway: string;

    @IsNotEmpty()
    @IsString()
    appCert: string;

    @IsNotEmpty()
    @IsString()
    alipayPublicCert: string;

    @IsNotEmpty()
    @IsString()
    alipayRootCert: string;
}

@ValidatorConstraint({ name: "IsValidPayConfig", async: false })
class IsValidPayConfigConstraint implements ValidatorConstraintInterface {
    validate(config: any, args: ValidationArguments) {
        // In other cases, config is required
        if (!config) {
            return false;
        }

        const object = args.object as PayConfigInfo;
        let DtoClass: any;
        switch (object.payType) {
            case PayConfigPayType.WECHAT:
                DtoClass = WeChatPayConfigDto;
                break;
            case PayConfigPayType.ALIPAY:
                DtoClass = AlipayConfigDto;
                break;
            default:
                return false;
        }

        // validate
        const configInstance = plainToInstance(DtoClass, config);
        const errors = validateSync(configInstance);

        return errors.length === 0;
    }

    defaultMessage(args: ValidationArguments) {
        const object = args.object as PayConfigInfo;
        const config = args.value;

        if (!config) {
            return "Payment configuration cannot be empty";
        }

        // Detail error
        let DtoClass: any;
        switch (object.payType) {
            case PayConfigPayType.WECHAT:
                DtoClass = WeChatPayConfigDto;
                break;
            case PayConfigPayType.ALIPAY:
                DtoClass = AlipayConfigDto;
                break;
            default:
                return "Invalid pay type";
        }

        const configInstance = plainToInstance(DtoClass, config);
        const errors = validateSync(configInstance);

        if (errors.length > 0) {
            const errorMessages = errors
                .map((error) => Object.values(error.constraints || {}).join(", "))
                .join("; ");
            return `Config validation failed: ${errorMessages}`;
        }

        return "Invalid pay config";
    }
}

/**
 * 更新支付配置数据传输对象
 * 用于验证和传输更新支付配置时的数据
 */
export class UpdatePayConfigDto {
    /**
     * 支付配置ID
     * 必填字段，用于标识要更新的支付配置
     */
    @IsNotEmpty()
    @IsString()
    id: string;

    /**
     * 支付配置名称
     * 必填字段，支付方式的显示名称
     */
    @IsNotEmpty()
    @IsString()
    name: string;

    /**
     * 支付配置Logo
     * 必填字段，支付方式的图标URL或路径
     */
    @IsNotEmpty()
    @IsString()
    logo: string;

    /**
     * 启用状态
     * 必填字段，0表示禁用，1表示启用
     */
    @IsNotEmpty()
    @IsInt({ message: "状态必须是整数" })
    @IsIn([0, 1], { message: "状态只能是0(禁用)或1(启用)" })
    isEnable: number;

    /**
     * 默认支付方式
     * 必填字段，0表示非默认，1表示默认支付方式
     */
    @IsNotEmpty()
    @IsInt({ message: "默认必须是整数" })
    @IsIn([0, 1], { message: "默认只能是0或1" })
    isDefault: number;

    /**
     * 排序权重
     * 必填字段，用于控制支付方式的显示顺序
     * 数值越小排序越靠前
     */
    @IsNotEmpty()
    @IsInt({ message: "排序必须是整数" })
    sort: number;

    /**
     * 支付方式
     * 必填字段，用于指示更新的具体支付类型
     */
    @IsNotEmpty()
    @IsEnum(PayConfigPayType)
    payType: PayConfigType;

    /**
     * 具体支付方式的配置
     * 必填字段，根据 payType 动态决定具体的 ValidateDto
     */
    @Validate(IsValidPayConfigConstraint)
    config: WeChatPayConfigDto | AlipayConfigDto;
}

export class UpdatePayConfigStatusDto {
    @IsNotEmpty({ message: "启用状态不能为空" })
    @IsInt({ message: "启用状态必须是整数" })
    @IsIn([0, 1], { message: "启用状态必须是 0 或 1" })
    isEnable: 0 | 1;
}
