import { BaseService } from "@buildingai/base";
import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { FileUploadService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { WxMpVersion, WxMpVersionStatus, WxMpVersionType } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Request } from "express";
import { existsSync, mkdirp, readdirSync, readFileSync, statSync } from "fs-extra";
import * as ci from "miniprogram-ci";
import { join, resolve } from "path";

import { PreviewMpVersionDto } from "../dto/preview-mp-version.dto";
import { UploadMpVersionDto } from "../dto/upload-mp-version.dto";
import { WxMpConfigService } from "./wxmpconfig.service";

/**
 * 小程序版本管理服务
 *
 * 提供小程序版本上传、预览、历史版本查询和 SourceMap 下载功能
 */
@Injectable()
export class WxMpVersionService extends BaseService<WxMpVersion> {
    /**
     * 小程序代码包路径
     */
    private readonly projectPath: string;

    /**
     * 存储根目录
     */
    private readonly storageRoot: string;

    /**
     * 预览二维码存储目录
     */
    private readonly qrcodeDir: string;

    /**
     * SourceMap 存储目录
     */
    private readonly sourceMapDir: string;

    /**
     * 小程序编译配置（统一配置，避免重复）
     */
    private readonly compileSetting = {
        es6: false,
        es7: false,
        minify: false,
        autoPrefixWXSS: false,
        codeProtect: false,
        minifyJS: false,
        minifyWXML: false,
        minifyWXSS: false,
    };

    constructor(
        @InjectRepository(WxMpVersion) repository: Repository<WxMpVersion>,
        private readonly wxMpConfigService: WxMpConfigService,
        private readonly fileUploadService: FileUploadService,
    ) {
        super(repository);
        // 初始化路径
        this.projectPath = resolve(__dirname, "../../../../../mobile/uniapp/dist/build/mp-weixin");
        this.storageRoot = resolve(__dirname, "../../../../../storage");
        this.qrcodeDir = join(this.storageRoot, "static", "wxmp", "qrcode");
        this.sourceMapDir = join(this.storageRoot, "static", "wxmp", "sourcemap");
        // 确保存储目录存在
        mkdirp(this.qrcodeDir).catch((err) => {
            this.logger.error(`创建预览二维码目录失败: ${err.message}`);
        });
        mkdirp(this.sourceMapDir).catch((err) => {
            this.logger.error(`创建 SourceMap 目录失败: ${err.message}`);
        });
    }

    /**
     * 上传小程序版本
     *
     * @param dto 上传版本 DTO
     * @param userId 用户ID
     * @param username 用户名
     * @returns 上传结果
     */
    async uploadVersion(dto: UploadMpVersionDto, userId: string, username: string) {
        const config = await this.wxMpConfigService.getConfig();
        if (!config.appId || !config.uploadKey) {
            throw HttpErrorFactory.paramError(
                "小程序配置不完整，请先配置 AppId 和上传密钥",
                undefined,
                BusinessCode.PARAM_INVALID,
            );
        }

        if (!existsSync(this.projectPath)) {
            throw HttpErrorFactory.paramError(
                `小程序代码包目录不存在: ${this.projectPath}`,
                undefined,
                BusinessCode.PARAM_INVALID,
            );
        }

        const versionRecord = await this.create({
            version: dto.version,
            description: dto.description || "",
            type: WxMpVersionType.UPLOAD,
            status: WxMpVersionStatus.UPLOADING,
            uploaderId: userId,
            uploaderName: username,
            packagePath: this.projectPath,
        });

        try {
            const project = new ci.Project({
                appid: config.appId,
                type: "miniProgram",
                projectPath: this.projectPath,
                privateKey: config.uploadKey,
            });

            const packageSize = this.calculateDirSize(this.projectPath);
            await ci.upload({
                project,
                version: dto.version,
                desc: dto.description || `版本 ${dto.version}`,
                setting: this.compileSetting,
            });

            await this.updateById(versionRecord.id, {
                status: WxMpVersionStatus.SUCCESS,
                packageSize,
            });

            return {
                id: versionRecord.id,
                version: dto.version,
                status: WxMpVersionStatus.SUCCESS,
                message: "上传成功",
            };
        } catch (error: any) {
            await this.updateById(versionRecord.id, {
                status: WxMpVersionStatus.FAILED,
                errorMessage: error.message || "上传失败",
            });
            this.logger.error(`小程序版本上传失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.business(
                `上传失败: ${error.message}`,
                BusinessCode.BUSINESS_ERROR,
            );
        }
    }

    /**
     * 预览小程序版本
     *
     * @param dto 预览版本 DTO
     * @param userId 用户ID
     * @param username 用户名
     * @param request Express 请求对象
     * @returns 预览结果（包含二维码URL）
     */
    async previewVersion(
        dto: PreviewMpVersionDto,
        userId: string,
        username: string,
        request: Request,
    ) {
        const config = await this.wxMpConfigService.getConfig();
        if (!config.appId || !config.uploadKey) {
            throw HttpErrorFactory.paramError(
                "小程序配置不完整，请先配置 AppId 和上传密钥",
                undefined,
                BusinessCode.PARAM_INVALID,
            );
        }

        if (!existsSync(this.projectPath)) {
            throw HttpErrorFactory.paramError(
                `小程序代码包目录不存在: ${this.projectPath}`,
                undefined,
                BusinessCode.PARAM_INVALID,
            );
        }

        const previewVersion = `preview-${Date.now()}`;
        const versionRecord = await this.create({
            version: previewVersion,
            description: dto.description || "预览版本",
            type: WxMpVersionType.PREVIEW,
            status: WxMpVersionStatus.UPLOADING,
            uploaderId: userId,
            uploaderName: username,
            packagePath: this.projectPath,
        });

        try {
            const project = new ci.Project({
                appid: config.appId,
                type: "miniProgram",
                projectPath: this.projectPath,
                privateKey: config.uploadKey,
            });

            const qrcodeFileName = `${randomUUID()}.jpg`;
            const qrcodePath = join(this.qrcodeDir, qrcodeFileName);

            // 生成预览二维码
            await ci.preview({
                project,
                version: previewVersion,
                desc: dto.description || "预览版本",
                setting: this.compileSetting,
                qrcodeFormat: "image",
                qrcodeOutputDest: qrcodePath,
            } as any);

            // 读取二维码文件并使用公共上传接口上传
            const qrcodeFile = this.createMulterFile(qrcodePath, qrcodeFileName);
            const uploadResult = await this.fileUploadService.uploadFile(
                qrcodeFile,
                request,
                `小程序预览二维码 - ${previewVersion}`,
            );

            const packageSize = this.calculateDirSize(this.projectPath);

            await this.updateById(versionRecord.id, {
                status: WxMpVersionStatus.SUCCESS,
                packageSize,
                qrcodeUrl: uploadResult.url,
                qrcodePath: uploadResult.id,
            });

            return {
                id: versionRecord.id,
                qrcodeUrl: uploadResult.url,
                status: WxMpVersionStatus.SUCCESS,
                message: "预览成功",
            };
        } catch (error: any) {
            await this.updateById(versionRecord.id, {
                status: WxMpVersionStatus.FAILED,
                errorMessage: error.message || "预览失败",
            });
            this.logger.error(`小程序预览失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.business(
                `预览失败: ${error.message}`,
                BusinessCode.BUSINESS_ERROR,
            );
        }
    }

    /**
     * 获取历史上传版本列表
     *
     * @param page 页码
     * @param pageSize 每页数量
     * @param type 版本类型（可选）
     * @returns 版本列表
     */
    async getVersionHistory(page: number = 1, pageSize: number = 10, type?: WxMpVersionType) {
        const where: any = {};
        if (type) {
            where.type = type;
        }

        const result = await this.paginate(
            {
                page,
                pageSize,
            },
            {
                where,
                order: {
                    createdAt: "DESC",
                },
            },
        );

        return result;
    }

    /**
     * 获取最近上传版本的 SourceMap
     *
     * @returns SourceMap 文件路径
     */
    async getLatestSourceMap() {
        // 获取小程序配置
        const config = await this.wxMpConfigService.getConfig();
        if (!config.appId || !config.uploadKey) {
            throw HttpErrorFactory.paramError(
                "小程序配置不完整，请先配置 AppId 和上传密钥",
                undefined,
                BusinessCode.PARAM_INVALID,
            );
        }

        // 查找最近一次成功上传的版本
        const latestVersion = await this.findOne({
            where: {
                type: WxMpVersionType.UPLOAD,
                status: WxMpVersionStatus.SUCCESS,
            },
            order: {
                createdAt: "DESC",
            },
        });

        if (!latestVersion) {
            throw HttpErrorFactory.notFound("未找到已上传的版本");
        }

        // 如果已有 SourceMap，直接返回
        if (latestVersion.sourceMapPath && existsSync(latestVersion.sourceMapPath)) {
            return {
                sourceMapPath: latestVersion.sourceMapPath,
                sourceMapUrl: `/storage/static/wxmp/sourcemap/${latestVersion.sourceMapPath.split("/").pop()}`,
                version: latestVersion.version,
                createdAt: latestVersion.createdAt,
            };
        }

        try {
            const project = new ci.Project({
                appid: config.appId,
                type: "miniProgram",
                projectPath: this.projectPath,
                privateKey: config.uploadKey,
                ignores: ["node_modules/**/*"],
            });

            const sourceMapFileName = `sourcemap-${latestVersion.version}-${Date.now()}.zip`;
            const sourceMapPath = join(this.sourceMapDir, sourceMapFileName);

            await ci.getDevSourceMap({
                project,
                robot: 1,
                sourceMapSavePath: sourceMapPath,
            });

            await this.updateById(latestVersion.id, {
                sourceMapPath,
                sourceMapSize: statSync(sourceMapPath).size,
            });

            return {
                sourceMapPath,
                sourceMapUrl: `/storage/static/wxmp/sourcemap/${sourceMapFileName}`,
                version: latestVersion.version,
                createdAt: latestVersion.createdAt,
            };
        } catch (error: any) {
            this.logger.error(`获取 SourceMap 失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.business(
                `获取 SourceMap 失败: ${error.message}`,
                BusinessCode.BUSINESS_ERROR,
            );
        }
    }

    /**
     * 创建 Multer.File 对象
     *
     * @param filePath 文件路径
     * @param fileName 文件名
     * @returns Multer.File 对象
     */
    private createMulterFile(filePath: string, fileName: string): Express.Multer.File {
        const buffer = readFileSync(filePath);
        return {
            fieldname: "qrcode",
            originalname: fileName,
            encoding: "7bit",
            mimetype: "image/jpeg",
            size: buffer.length,
            buffer,
            destination: "",
            filename: fileName,
            path: filePath,
            stream: null as any,
        };
    }

    /**
     * 计算目录大小（字节）
     *
     * @param dirPath 目录路径
     * @returns 目录大小（字节）
     */
    private calculateDirSize(dirPath: string): number {
        if (!existsSync(dirPath)) {
            return 0;
        }

        let totalSize = 0;
        const files = readdirSync(dirPath);

        for (const file of files) {
            const filePath = join(dirPath, file);
            const stat = statSync(filePath);

            if (stat.isDirectory()) {
                totalSize += this.calculateDirSize(filePath);
            } else {
                totalSize += stat.size;
            }
        }

        return totalSize;
    }
}
