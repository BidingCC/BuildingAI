/**
 * 业务错误码常量
 *
 * 错误码设计规则：
 * 1. 成功码：20000
 * 2. 客户端错误：4xxxx（前缀4，后续4位为具体错误码）
 * 3. 服务端错误：5xxxx（前缀5，后续4位为具体错误码）
 * 4. 第二位表示错误类型：
 *    - 0: 通用错误
 *    - 1: 参数错误
 *    - 2: 权限错误
 *    - 3: 用户相关错误
 *    - 4: 数据错误
 *    - 5: 第三方服务错误
 *    - 6: 业务逻辑错误
 *    - 7: 资源错误
 *    - 8: 配置错误
 *    - 9: 系统错误
 */
export const BusinessCode = {
    // ==================== 成功 ====================
    SUCCESS: 20000,

    // ==================== 客户端错误 ====================

    // 通用客户端错误 (400xx)
    BAD_REQUEST: 40000, // 错误的请求
    INVALID_REQUEST: 40001, // 无效的请求
    REQUEST_FAILED: 40002, // 请求失败

    // 参数错误 (401xx)
    PARAM_INVALID: 40100, // 参数无效
    PARAM_MISSING: 40101, // 参数缺失
    PARAM_TYPE_ERROR: 40102, // 参数类型错误
    PARAM_FORMAT_ERROR: 40103, // 参数格式错误

    // 权限错误 (402xx)
    UNAUTHORIZED: 40200, // 未授权
    TOKEN_INVALID: 40201, // Token无效
    TOKEN_EXPIRED: 40202, // Token过期
    PERMISSION_DENIED: 40203, // 权限不足
    FORBIDDEN: 40204, // 禁止访问

    // 用户相关错误 (403xx)
    USER_NOT_FOUND: 40300, // 用户不存在
    USER_ALREADY_EXISTS: 40301, // 用户已存在
    USER_DISABLED: 40302, // 用户已禁用
    LOGIN_FAILED: 40303, // 登录失败
    PASSWORD_INCORRECT: 40304, // 密码错误
    ACCOUNT_LOCKED: 40305, // 账号已锁定

    // 数据错误 (404xx)
    RESOURCE_NOT_FOUND: 40400, // 资源不存在
    DATA_ALREADY_EXISTS: 40401, // 数据已存在
    DATA_CONFLICT: 40402, // 数据冲突
    DATA_INVALID: 40403, // 数据无效
    DATA_EXPIRED: 40404, // 数据已过期

    // 业务逻辑错误 (406xx)
    OPERATION_FAILED: 40600, // 操作失败
    OPERATION_NOT_ALLOWED: 40601, // 操作不允许
    BUSINESS_ERROR: 40602, // 业务错误
    VALIDATION_FAILED: 40603, // 验证失败
    MEMBERSHIP_REQUIRED: 40604, // 需要会员权限
    MEMBERSHIP_LEVEL_INSUFFICIENT: 40605, // 会员等级不足

    // 请求限制错误 (407xx)
    TOO_MANY_REQUESTS: 40700, // 请求过于频繁
    REQUEST_TIMEOUT: 40701, // 请求超时
    RATE_LIMIT_EXCEEDED: 40702, // 超出请求频率限制

    // ==================== 服务端错误 ====================

    // 通用服务端错误 (500xx)
    INTERNAL_SERVER_ERROR: 50000, // 服务器内部错误
    SERVICE_UNAVAILABLE: 50001, // 服务不可用
    GATEWAY_TIMEOUT: 50002, // 网关超时

    // 数据库错误 (504xx)
    DB_CONNECTION_ERROR: 50400, // 数据库连接错误
    DB_QUERY_ERROR: 50401, // 数据库查询错误
    DB_TRANSACTION_ERROR: 50402, // 数据库事务错误

    // 第三方服务错误 (505xx)
    THIRD_PARTY_SERVICE_ERROR: 50500, // 第三方服务错误
    API_REQUEST_FAILED: 50501, // API请求失败

    // 系统错误 (509xx)
    SYSTEM_ERROR: 50900, // 系统错误
    CONFIG_ERROR: 50901, // 配置错误
    INITIALIZATION_ERROR: 50902, // 初始化错误
} as const;

/**
 * 业务错误码类型
 */
export type BusinessCodeType = (typeof BusinessCode)[keyof typeof BusinessCode];

/**
 * 业务错误码键类型
 */
export type BusinessCodeKey = keyof typeof BusinessCode;
