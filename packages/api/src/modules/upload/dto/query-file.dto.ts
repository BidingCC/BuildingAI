import { FileType } from "@buildingai/db/entities";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";

/**
 * 文件查询DTO
 *
 * 用于文件查询接口的参数验证，继承自分页DTO
 */
export class QueryFileDto extends PaginationDto {
    /**
     * 文件类型
     */
    @IsOptional()
    @IsEnum(FileType, { message: "文件类型无效" })
    type?: FileType;

    /**
     * 文件名关键字
     */
    @IsOptional()
    @IsString({ message: "文件名关键字必须是字符串" })
    keyword?: string;

    /**
     * 上传者ID
     */
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsString({ message: "上传者ID必须是数字" })
    uploaderId?: string;
}
