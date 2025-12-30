import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

/**
 * 小程序版本类型枚举
 */
export enum WxMpVersionType {
    /**
     * 上传版本
     */
    UPLOAD = "upload",
    /**
     * 预览版本
     */
    PREVIEW = "preview",
}

/**
 * 小程序版本状态枚举
 */
export enum WxMpVersionStatus {
    /**
     * 上传中
     */
    UPLOADING = "uploading",
    /**
     * 上传成功
     */
    SUCCESS = "success",
    /**
     * 上传失败
     */
    FAILED = "failed",
}

/**
 * 小程序版本实体
 *
 * 用于记录小程序版本上传和预览历史
 */
@AppEntity({ name: "wx_mp_version", comment: "小程序版本管理" })
export class WxMpVersion extends BaseEntity {
    /**
     * 版本号
     */
    @Column({ type: "varchar", length: 50 })
    @Index()
    version: string;

    /**
     * 版本描述
     */
    @Column({ type: "text", nullable: true })
    description: string;

    /**
     * 版本类型
     */
    @Column({
        type: "varchar",
        length: 20,
        default: WxMpVersionType.UPLOAD,
    })
    @Index()
    type: WxMpVersionType;

    /**
     * 版本状态
     */
    @Column({
        type: "varchar",
        length: 20,
        default: WxMpVersionStatus.SUCCESS,
    })
    @Index()
    status: WxMpVersionStatus;

    /**
     * 上传者ID
     */
    @Column({ type: "uuid", nullable: true })
    @Index()
    uploaderId: string;

    /**
     * 上传者名称
     */
    @Column({ type: "varchar", length: 100, nullable: true })
    uploaderName: string;

    /**
     * 上传的代码包大小（字节）
     */
    @Column({ type: "bigint", nullable: true })
    packageSize: number;

    /**
     * 预览二维码URL（仅预览版本）
     */
    @Column({ type: "varchar", length: 1024, nullable: true })
    qrcodeUrl: string;

    /**
     * 预览二维码本地路径（仅预览版本）
     */
    @Column({ type: "varchar", length: 1024, nullable: true })
    qrcodePath: string;

    /**
     * 错误信息（上传失败时）
     */
    @Column({ type: "text", nullable: true })
    errorMessage: string;

    /**
     * 上传的代码包路径
     */
    @Column({ type: "varchar", length: 1024, nullable: true })
    packagePath: string;

    /**
     * SourceMap 文件路径
     */
    @Column({ type: "varchar", length: 1024, nullable: true })
    sourceMapPath: string;

    /**
     * SourceMap 文件大小（字节）
     */
    @Column({ type: "bigint", nullable: true })
    sourceMapSize: number;
}


