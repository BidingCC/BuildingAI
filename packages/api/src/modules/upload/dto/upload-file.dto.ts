import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

/**
 * 文件上传DTO
 *
 * 用于文件上传接口的参数验证
 */
export class UploadFileDto {
    /**
     * 文件描述
     */
    @IsOptional()
    @IsString({ message: "文件描述必须是字符串" })
    description?: string;

    /**
     * 文件扩展名ID
     */
    @IsOptional()
    @IsString({ message: "拓展ID必须是字符串" })
    extensionId?: string;
}

export class SignatureRequestDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsNumber()
    size: number;

    @IsOptional()
    @IsString()
    extensionId?: string;
}

/**
 * 保存 OSS 文件记录 DTO
 *
 * 用于将 OSS 上传的文件信息保存到数据库
 */
export class SaveOSSFileDto {
    /**
     * 文件 URL（OSS 地址）
     */
    @IsNotEmpty()
    @IsString({ message: "文件URL必须是字符串" })
    url: string;

    /**
     * 原始文件名
     */
    @IsNotEmpty()
    @IsString({ message: "原始文件名必须是字符串" })
    originalName: string;

    /**
     * 文件大小（字节）
     */
    @IsNotEmpty()
    @IsNumber({}, { message: "文件大小必须是数字" })
    size: number;

    /**
     * 文件扩展名
     */
    @IsOptional()
    @IsString({ message: "文件扩展名必须是字符串" })
    extension?: string;

    /**
     * 文件 MIME 类型
     */
    @IsOptional()
    @IsString({ message: "文件MIME类型必须是字符串" })
    type?: string;

    /**
     * 文件描述
     */
    @IsOptional()
    @IsString({ message: "文件描述必须是字符串" })
    description?: string;

    /**
     * 文件扩展名ID
     */
    @IsOptional()
    @IsString({ message: "拓展ID必须是字符串" })
    extensionId?: string;

    /**
     * 文件存储路径（OSS 中的路径）
     */
    @IsOptional()
    @IsString({ message: "文件存储路径必须是字符串" })
    path?: string;
}
