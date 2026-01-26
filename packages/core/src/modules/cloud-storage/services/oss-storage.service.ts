import { RedisService } from "@buildingai/cache";
import { AliyunOssConfig } from "@buildingai/constants";
import { Injectable } from "@nestjs/common";
import OSS, { STS } from "ali-oss";
import { getCredential } from "ali-oss/lib/common/signUtils";
import { getStandardRegion } from "ali-oss/lib/common/utils/getStandardRegion";
import { policy2Str } from "ali-oss/lib/common/utils/policy2Str";

import { CloudStorageParams } from "../interfaces/cloud-storage.interface";

interface AliyunSTSResult {
    accessKeyId: string;
    accessKeySecret: string;
    securityToken: string;
}

@Injectable()
export class OssStorageService {
    private readonly CACHE_PREFIX = "sts:credentials";
    private ossClient: OSS | null = null;

    constructor(private readonly cacheService: RedisService) {}

    async upload({ storageConfig, file, ...params }: CloudStorageParams) {
        const config = storageConfig.config as AliyunOssConfig;
        const client = this.getOssClient(config);

        const uploadHeader: Record<string, string> = {
            "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalname)}"`,
        };
        if (params.description) {
            // Encode description to handle non-ASCII characters (e.g., Chinese)
            uploadHeader["x-oss-meta-description"] = encodeURIComponent(params.description);
        }

        return await client.put(params.path, file.buffer, {
            mime: file.mimetype,
            headers: uploadHeader,
        });
    }

    /**
     * web
     */
    async generateOssUploadSignature(config: AliyunOssConfig) {
        const stsResult = await this.getSTSCredentials(config);
        const signature = await this.getAliyunSignature(config, stsResult);

        return {
            ...signature,
            host: config.domain,
            bucket: config.bucket,
            securityToken: stsResult.securityToken,
        };
    }

    async clearOssStsCredentials() {
        const cacheKey = `${this.CACHE_PREFIX}:oss`;
        await this.cacheService.del(cacheKey);
        this.ossClient = null;
    }

    private getOssClient(config: AliyunOssConfig) {
        if (this.ossClient) {
            return this.ossClient;
        }

        this.ossClient = new OSS({
            region: `oss-${config.region}`,
            accessKeyId: config.accessKey,
            accessKeySecret: config.secretKey,
            bucket: config.bucket,
            secure: true,
        });

        return this.ossClient;
    }

    private async getAliyunSignature(config: AliyunOssConfig, sts: AliyunSTSResult) {
        const client = new OSS({
            bucket: config.bucket,
            region: config.region,
            accessKeyId: sts.accessKeyId,
            accessKeySecret: sts.accessKeySecret,
            stsToken: sts.securityToken,
        });

        // Set the signature expiration time to 10 minutes later than the current time
        const date = new Date();
        const expirationDate = new Date(date);
        expirationDate.setMinutes(date.getMinutes() + 10);

        // Format the date in UTC time string format that complies with the ISO 8601 standard
        const padTo2Digits = (num: number) => num.toString().padStart(2, "0");
        const formatDateToUTC = (date: Date) => {
            return (
                date.getUTCFullYear() +
                padTo2Digits(date.getUTCMonth() + 1) +
                padTo2Digits(date.getUTCDate()) +
                "T" +
                padTo2Digits(date.getUTCHours()) +
                padTo2Digits(date.getUTCMinutes()) +
                padTo2Digits(date.getUTCSeconds()) +
                "Z"
            );
        };
        const formattedDate = formatDateToUTC(expirationDate);

        // Generate x-oss-credential
        const credential = getCredential(
            formattedDate.split("T")[0],
            getStandardRegion(config.region),
            sts.accessKeyId,
        );

        // Create a policy(list required fields)
        const ossSignatureVersion = "OSS4-HMAC-SHA256";
        const policy = {
            expiration: expirationDate.toISOString(),
            conditions: [
                { bucket: config.bucket },
                { "x-oss-credential": credential },
                { "x-oss-signature-version": ossSignatureVersion },
                { "x-oss-date": formattedDate },
                { "x-oss-security-token": sts.securityToken },
            ],
        };

        const signature = (client as any).signPostObjectPolicyV4(policy, date);

        return {
            signature,
            ossSignatureVersion,
            policy: Buffer.from(policy2Str(policy)).toString("base64"),
            ossCredential: credential,
            ossDate: formattedDate,
        };
    }

    private async getSTSCredentials(config: AliyunOssConfig): Promise<AliyunSTSResult> {
        const cacheKey = `${this.CACHE_PREFIX}:oss`;
        const cachedResult = await this.cacheService.getHash<{
            accessKeyId: string;
            accessKeySecret: string;
            securityToken: string;
        }>(cacheKey);

        if (cachedResult) {
            return cachedResult;
        }

        let sts = new STS({ accessKeyId: config.accessKey, accessKeySecret: config.secretKey });
        const expirationSeconds = 3600;
        const result = await sts.assumeRole(config.arn, "", expirationSeconds);

        const credentials = {
            accessKeyId: result.credentials.AccessKeyId,
            accessKeySecret: result.credentials.AccessKeySecret,
            securityToken: result.credentials.SecurityToken,
        };

        await this.cacheService.setHash(cacheKey, credentials, expirationSeconds);

        return credentials;
    }
}
