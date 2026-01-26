import type {
    ACCOUNT_LOG_SOURCE_VALUE,
    ACCOUNT_LOG_TYPE_VALUE,
} from "@buildingai/constants/shared/account-log.constants";

/**
 * Power deduction options
 */
export interface PowerDeductionOptions {
    /** User ID */
    userId: string;
    /** Power amount to deduct */
    amount: number;
    /** Account log type for the deduction */
    accountType: ACCOUNT_LOG_TYPE_VALUE;
    /** Deduction source information */
    source: {
        /** Source type */
        type: ACCOUNT_LOG_SOURCE_VALUE;
        /** Source description */
        source: string;
    };
    /** Remark for the deduction */
    remark?: string;
    /** Association number (e.g., order number) */
    associationNo?: string;
    /** Associated user ID */
    associationUserId?: string;
}

/**
 * Power addition options
 */
export interface PowerAdditionOptions {
    /** User ID */
    userId: string;
    /** Power amount to add */
    amount: number;
    /** Account log type for the addition */
    accountType: ACCOUNT_LOG_TYPE_VALUE;
    /** Addition source information */
    source: {
        /** Source type */
        type: ACCOUNT_LOG_SOURCE_VALUE;
        /** Source description */
        source: string;
    };
    /** Remark for the addition */
    remark?: string;
    /** Association number (e.g., order number) */
    associationNo?: string;
    /** Associated user ID */
    associationUserId?: string;
    /**
     * 积分过期时间
     * 仅对会员赠送积分有效,到期后积分清零
     */
    expireAt?: Date;
}
