import { DataSource } from "typeorm";

/**
 * Migration: move-pay-config-fields
 * Version: 25.3.0
 * Created: 2026-01-03T14:40:13.607Z
 */

/**
 * Run migration
 */
export async function up(dataSource: DataSource): Promise<void> {
    // 获取所有配置
    const configs = await dataSource.query(`
            SELECT 
                id, 
                payType, 
                appId, 
                merchantType, 
                payVersion,
                mchId,
                apiKey,
                paySignKey,
                cert,
                payAuthDir,
                config 
            FROM payconfig
        `);

    // 更新每条记录
    for (const row of configs) {
        let config: any = {};

        // 解析现有 config
        if (row.config) {
            try {
                config = typeof row.config === "string" ? JSON.parse(row.config) : row.config;
            } catch (e) {
                console.warn(`配置 ${row.id} 解析失败`);
            }
        }

        // 移入 appId
        if (row.appId) {
            config.appId = row.appId;
        }

        // 微信支付
        if (row.payType === 1 || row.payType === "wechat") {
            // 移入证书字段
            if (row.mchId) config.mchId = row.mchId;
            if (row.apiKey) config.apiKey = row.apiKey;
            if (row.paySignKey) config.paySignKey = row.paySignKey;
            if (row.cert) config.cert = row.cert;
            if (row.payAuthDir) config.payAuthDir = row.payAuthDir;

            // 移入其他字段
            if (row.merchantType) config.merchantType = row.merchantType;
            if (row.payVersion) config.payVersion = row.payVersion;
        }

        // 更新数据库
        await dataSource.query(`UPDATE payconfig SET config = ? WHERE id = ?`, [
            JSON.stringify(config),
            row.id,
        ]);
    }
}

/**
 * Revert migration (optional)
 */
export async function down(dataSource: DataSource): Promise<void> {
    const configs = await dataSource.query(`SELECT id, payType, config FROM payconfig`);

    for (const row of configs) {
        if (!row.config) continue;

        let config: any = {};
        try {
            config = typeof row.config === "string" ? JSON.parse(row.config) : row.config;
        } catch (e) {
            continue;
        }

        // 提取字段
        const appId = config.appId || null;
        const merchantType = config.merchantType || null;
        const mchId = config.mchId || null;
        const apiKey = config.apiKey || null;
        const paySignKey = config.paySignKey || null;
        const cert = config.cert || null;
        const payAuthDir = config.payAuthDir || null;

        let payVersion = null;
        if (row.payType === 1 || row.payType === "wechat") {
            payVersion = config.payVersion || null;
        } else {
            payVersion = config.signType || null;
        }

        // 更新基础字段
        await dataSource.query(
            `UPDATE payconfig 
                SET appId = ?, merchantType = ?, payVersion = ?,
                    mchId = ?, apiKey = ?, paySignKey = ?, cert = ?, payAuthDir = ?
                WHERE id = ?`,
            [appId, merchantType, payVersion, mchId, apiKey, paySignKey, cert, payAuthDir, row.id],
        );
    }
}
