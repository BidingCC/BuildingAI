import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "thirdPartyIntegrationRequired", async: false })
export class ThirdPartyIntegrationRequiredConstraint implements ValidatorConstraintInterface {
    validate(thirdPartyIntegration: any, args: ValidationArguments) {
        const object = args.object as any;
        const createMode = object.createMode;

        // 如果 createMode 是 null、undefined 或 "direct"，则不需要验证第三方集成配置
        if (!createMode || createMode === "direct") {
            return true;
        }

        // 如果是第三方模式，则需要验证配置
        if (!thirdPartyIntegration) {
            return false;
        }

        // 如果 thirdPartyIntegration 是空对象，也认为配置无效
        const keys = Object.keys(thirdPartyIntegration);
        if (keys.length === 0) {
            return false;
        }

        // 验证必填字段
        const { apiKey, baseURL } = thirdPartyIntegration;
        return !!(apiKey && baseURL);
    }

    defaultMessage(args: ValidationArguments) {
        const object = args.object as any;
        const createMode = object.createMode;

        if (!createMode || createMode === "direct") {
            return ""; // 不需要验证时返回空消息
        }

        const thirdPartyIntegration = args.value;
        if (!thirdPartyIntegration) {
            return "第三方集成配置不能为空";
        }

        const { apiKey, baseURL } = thirdPartyIntegration;
        if (!apiKey) {
            return "thirdPartyIntegration.API密钥不能为空";
        }
        if (!baseURL) {
            return "thirdPartyIntegration.API端点地址不能为空";
        }

        return "第三方集成配置无效";
    }
}

export function IsThirdPartyIntegrationValid(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: ThirdPartyIntegrationRequiredConstraint,
        });
    };
}
