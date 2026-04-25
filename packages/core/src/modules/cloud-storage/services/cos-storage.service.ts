import { RedisService } from "@buildingai/cache";
import { TencentCosConfig } from "@buildingai/constants";
import { Injectable } from "@nestjs/common";
import COS from "cos-nodejs-sdk-v5";
import { sts } from "tencentcloud-sdk-nodejs-sts";

import { CloudStorageParams } from "../interfaces/cloud-storage.interface";

/**
 * COS STS 临时凭证（业务使用类型）
 */
interface TencentSTSResult {
    tmpSecretId: string; //临时密钥 ID
    tmpSecretKey: string; //临时密钥 Key
    sessionToken: string; //临时会话令牌
    startTime: number; //凭证开始时间（Unix 时间戳，秒）
    expiredTime: number; //凭证过期时间（Unix 时间戳，秒）
}

/**
 * COS STS 临时凭证缓存结构（Redis Hash 字符串类型）
 */
interface TencentSTSCacheResult {
    tmpSecretId: string; //临时密钥 ID
    tmpSecretKey: string; //临时密钥 Key
    sessionToken: string; //临时会话令牌
    startTime: string; //凭证开始时间（字符串）
    expiredTime: string; //凭证过期时间（字符串）
}

@Injectable()
export class CosStorageService {
    /**
     * Redis 缓存前缀，用于保存 COS STS 临时凭证
     */
    private readonly CACHE_PREFIX = "sts:cos-credentials";

    /**
     * 复用 COS SDK 客户端，避免每次上传重复实例化
     */
    private cosClient: COS | null = null;

    constructor(private readonly cacheService: RedisService) {}

    /**
     * 服务端上传文件到 COS
     */
    async upload({ storageConfig, file, ...params }: CloudStorageParams) {
        const config = storageConfig.config as TencentCosConfig;
        const client = this.getCosClient(config);
        const uploadHeaders: Record<string, string> = {
            "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalname)}"`,
        };

        if (params.description) {
            uploadHeaders["x-cos-meta-description"] = encodeURIComponent(params.description);
        }

        return await client.putObject({
            Bucket: config.bucket,
            Region: config.region,
            Key: params.path,
            Body: file.buffer,
            ContentType: file.mimetype,
            ContentDisposition: uploadHeaders["Content-Disposition"],
            Headers: uploadHeaders,
        });
    }

    /**
     * 生成前端直传 COS 所需签名与临时凭证信息
     */
    async generateCosUploadSignature(config: TencentCosConfig, key?: string) {
        // 获取临时凭证后再生成签名，避免下发长期密钥
        const stsResult = await this.getSTSCredentials(config);
        const client = this.getCosClient(config, stsResult);
        const expiresIn = 600;
        const authorization = client.getAuth({
            Method: "put",
            Bucket: config.bucket,
            Region: config.region,
            Key: key || "",
            Expires: expiresIn,
            ForceSignHost: true,
        });
        return {
            authorization,
            host: config.domain,
            bucket: config.bucket,
            region: config.region,
            securityToken: stsResult.sessionToken,
            tmpSecretId: stsResult.tmpSecretId,
            startTime: stsResult.startTime,
            expiredTime: stsResult.expiredTime,
        };
    }

    /**
     * 清理 COS STS 缓存并重置客户端
     */
    async clearCosStsCredentials() {
        const cacheKey = this.CACHE_PREFIX;
        await this.cacheService.del(cacheKey);
        this.cosClient = null;
    }

    /**
     * 获取 COS 客户端实例
     */
    private getCosClient(config: TencentCosConfig, sts?: TencentSTSResult) {
        if (!sts && this.cosClient) {
            return this.cosClient;
        }

        const client = new COS({
            SecretId: sts?.tmpSecretId ?? config.accessKey,
            SecretKey: sts?.tmpSecretKey ?? config.secretKey,
            SecurityToken: sts?.sessionToken,
            Protocol: "https:",
        });

        if (!sts) {
            this.cosClient = client;
        }

        return client;
    }

    /**
     * 获取 STS 临时凭证（优先读缓存，未命中则请求腾讯云 STS）
     */
    private async getSTSCredentials(config: TencentCosConfig): Promise<TencentSTSResult> {
        const cacheKey = `${this.CACHE_PREFIX}:cos`;
        const cachedResult = await this.cacheService.getHash<TencentSTSCacheResult>(cacheKey);
        if (cachedResult) {
            // Redis 中的 hash 值按字符串存储，读取后转回 number
            return {
                tmpSecretId: cachedResult.tmpSecretId,
                tmpSecretKey: cachedResult.tmpSecretKey,
                sessionToken: cachedResult.sessionToken,
                startTime: Number(cachedResult.startTime),
                expiredTime: Number(cachedResult.expiredTime),
            };
        }
        const StsClient = sts.v20180813.Client;
        const client = new StsClient({
            credential: {
                secretId: config.accessKey,
                secretKey: config.secretKey,
            },
            region: config.region,
            profile: {
                httpProfile: {
                    endpoint: "sts.tencentcloudapi.com",
                },
            },
        });
        const expirationSeconds = 3600;
        const result = await client.GetFederationToken({
            Name: "buildingaiCosUpload",
            Policy: JSON.stringify({
                version: "2.0",
                statement: [
                    {
                        effect: "allow",
                        action: ["name/cos:PutObject"],
                        resource: ["*"],
                    },
                ],
            }),
            DurationSeconds: expirationSeconds,
        } as any);
        const now = Math.floor(Date.now() / 1000);
        const credentials = {
            tmpSecretId: result.Credentials.TmpSecretId,
            tmpSecretKey: result.Credentials.TmpSecretKey,
            sessionToken: result.Credentials.Token,
            startTime: now,
            expiredTime: result.ExpiredTime ?? now + expirationSeconds,
        };

        await this.cacheService.setHash(
            cacheKey,
            {
                tmpSecretId: credentials.tmpSecretId,
                tmpSecretKey: credentials.tmpSecretKey,
                sessionToken: credentials.sessionToken,
                startTime: String(credentials.startTime),
                expiredTime: String(credentials.expiredTime),
            },
            expirationSeconds,
        );
        return credentials;
    }
}
