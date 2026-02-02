import { BaseController } from "@buildingai/base";
import { BusinessCode } from "@buildingai/constants";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { SYSTEM_CONFIG } from "@common/constants";
import { WebController } from "@common/decorators/controller.decorator";
import { QueryFileDto } from "@modules/upload/dto/query-file.dto";
import { RemoteUploadDto } from "@modules/upload/dto/remote-upload.dto";
import {
    SaveOSSFileDto,
    SignatureRequestDto,
    UploadFileDto,
} from "@modules/upload/dto/upload-file.dto";
import {
    Body,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Req,
    Res,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import * as fse from "fs-extra";

import { UploadService } from "../../services/upload.service";

/**
 * 文件上传控制器
 *
 * 处理文件上传、查询和下载等请求
 */
@WebController({ path: "upload" })
export class UploadController extends BaseController {
    /**
     * 构造函数
     *
     * @param uploadService 文件上传服务
     * @param dictService 字典服务
     */
    constructor(
        private readonly uploadService: UploadService,
        private readonly dictService: DictService,
    ) {
        super();
    }

    @Post("signature")
    async getUploadSignature(@Body() dto: SignatureRequestDto) {
        return this.uploadService.getUploadSignatureInfo(dto);
    }

    /**
     * 上传单个文件(初始化专用,无需鉴权)
     *
     * 仅在系统未初始化时可用,用于上传初始化所需的文件(如网站Logo、图标等)
     *
     * @param file 上传的文件
     * @param dto 上传参数
     * @returns 上传的文件信息
     */
    @Post("init-file")
    @Public()
    @UseInterceptors(FileInterceptor("file"))
    @BuildFileUrl(["**.url"])
    async uploadInitFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: UploadFileDto,
        @Req() req: Request,
    ) {
        // 检查系统是否已初始化
        const isInitialized = await this.dictService.get<boolean>(
            "isInitialized",
            false,
            SYSTEM_CONFIG,
        );
        if (isInitialized) {
            throw HttpErrorFactory.forbidden(
                "System is initialized, cannot use this interface",
                BusinessCode.OPERATION_NOT_ALLOWED,
            );
        }

        // Save file (request.user will be null for public routes)
        return this.uploadService.saveUploadedFile(file, req, dto.description);
    }

    /**
     * 上传单个文件
     *
     * @param file 上传的文件
     * @param dto 上传参数
     * @param req 请求对象
     * @returns 上传的文件信息
     */
    @Post("file")
    @UseInterceptors(FileInterceptor("file"))
    @BuildFileUrl(["**.url"])
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: UploadFileDto,
        @Req() req: Request,
    ) {
        // Save file (user info will be extracted from request in core service)
        return this.uploadService.saveUploadedFile(file, req, dto.description, dto.extensionId);
    }

    /**
     * 上传多个文件
     *
     * @param files 上传的文件数组
     * @param dto 上传参数
     * @returns 上传的文件信息数组
     */
    @Post("files")
    @UseInterceptors(FilesInterceptor("files", 10)) // Max 10 files
    @BuildFileUrl(["**.url"])
    async uploadFiles(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() dto: UploadFileDto,
        @Req() req: Request,
    ) {
        // Save files (user info will be extracted from request in core service)
        return this.uploadService.saveUploadedFiles(files, req, dto.description, dto.extensionId);
    }

    /**
     * 获取文件列表
     *
     * @param query 查询参数
     * @returns 分页的文件列表
     *
     * @deprecated
     */
    @Get()
    @BuildFileUrl(["**.url"])
    async getFiles(@Query() query: QueryFileDto) {
        // 构建查询条件
        const where: any = {};

        if (query.type) {
            where.type = query.type;
        }

        if (query.uploaderId) {
            where.uploaderId = query.uploaderId;
        }

        if (query.keyword) {
            where.originalName = { like: `%${query.keyword}%` };
        }

        // 查询文件
        return this.uploadService.paginate(query, {
            where,
            order: { createdAt: "DESC" },
        });
    }

    /**
     * 获取文件详情
     *
     * @param id 文件ID
     * @returns 文件详情
     *
     * @deprecated
     */
    @Get(":id")
    @BuildFileUrl(["**.url"])
    async getFile(@Param("id", UUIDValidationPipe) id: string) {
        return this.uploadService.getFileById(id);
    }

    /**
     * 下载文件
     *
     * @param id 文件ID
     * @param res 响应对象
     *
     * @deprecated
     */
    @Get("download/:id")
    async downloadFile(@Param("id", UUIDValidationPipe) id: string, @Res() res: Response) {
        // 获取文件信息
        const file = await this.uploadService.getFileById(id);

        // 获取文件物理路径
        const filePath = await this.uploadService.getFilePath(id);

        // 检查文件是否存在
        if (!(await fse.pathExists(filePath))) {
            throw HttpErrorFactory.notFound("文件不存在或已被删除");
        }

        // 设置响应头
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${encodeURIComponent(file.originalName)}`,
        );
        res.setHeader("Content-Type", file.mimeType);

        // 发送文件
        const fileStream = fse.createReadStream(filePath);
        fileStream.pipe(res);
    }

    /**
     * 远程文件上传
     *
     * @param remoteUploadDto 远程上传参数
     * @returns 上传结果
     */
    @Post("remote")
    @Public()
    @BuildFileUrl(["**.url"])
    async uploadRemoteFile(@Body() remoteUploadDto: RemoteUploadDto, @Req() req: Request) {
        // User info will be extracted from request in core service
        return this.uploadService.uploadRemoteFile(remoteUploadDto, req);
    }

    /**
     * 保存 OSS 文件记录到数据库
     *
     * @param saveOSSFileDto OSS 文件信息
     * @param req 请求对象
     * @returns 上传结果（包含文件ID）
     */
    @Post("oss-file")
    @BuildFileUrl(["**.url"])
    async saveOSSFileRecord(@Body() saveOSSFileDto: SaveOSSFileDto, @Req() req: Request) {
        // User info will be extracted from request in core service
        return this.uploadService.saveOSSFileRecord(saveOSSFileDto, req);
    }

    /**
     * 删除文件
     *
     * @param id 文件ID
     * @returns 删除结果
     *
     * @deprecated
     */
    @Delete(":id")
    async deleteFile(@Param("id", UUIDValidationPipe) id: string) {
        return this.uploadService.deleteFile(id);
    }
}
