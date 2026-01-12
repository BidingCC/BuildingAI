import { type SmsProviderData } from "@buildingai/constants";
import { SmsProvider, type SmsProviderType } from "@buildingai/constants/shared/sms.constant";
import { Column } from "typeorm";

import { AppEntity } from "../decorators/app-entity.decorator";
import { BaseEntity } from "./base";

@AppEntity({ name: "sms_config", comment: "短信服务配置" })
export class SmsConfig extends BaseEntity {
    @Column({ type: "enum", enum: SmsProvider, comment: "提供商" })
    provider: SmsProviderType;

    @Column({ type: "boolean", default: false, comment: "是否使用" })
    enable: boolean;

    @Column({ default: 0, comment: "排序" })
    sort: number;

    @Column({ type: "jsonb", nullable: true, comment: "具体配置" })
    providerConfig: SmsProviderData;
}
