import { Transform, Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    ValidateNested,
} from "class-validator";

/**
 * 文本预处理规则 DTO
 */
export class TextPreprocessingRulesDto {
    @IsOptional()
    @IsBoolean({ message: "替换连续空白字符必须是布尔值" })
    @Transform(({ value }) => value === true || value === "true")
    replaceConsecutiveWhitespace?: boolean = true;

    @IsOptional()
    @IsBoolean({ message: "删除URL和邮箱必须是布尔值" })
    @Transform(({ value }) => value === true || value === "true")
    removeUrlsAndEmails?: boolean = true;
}

/**
 * 分段配置 DTO
 */
export class SegmentationDto {
    @IsString({ message: "分段标识符必须是字符串" })
    @IsNotEmpty({ message: "分段标识符不能为空" })
    segmentIdentifier: string;

    @IsInt({ message: "分段最大长度必须是整数" })
    @Min(50, { message: "分段最大长度不能小于50" })
    @Max(8000, { message: "分段最大长度不能超过8000" })
    @Transform(({ value }) => parseInt(value))
    maxSegmentLength: number;

    @IsOptional()
    @IsInt({ message: "分段重叠长度必须是整数" })
    @Min(0, { message: "分段重叠长度不能小于0" })
    @Max(2000, { message: "分段重叠长度不能超过2000" })
    @Transform(({ value }) => parseInt(value))
    segmentOverlap?: number;
}

/**
 * 子分段配置 DTO
 */
export class SubSegmentationDto {
    @IsString({ message: "子分段标识符必须是字符串" })
    @IsNotEmpty({ message: "子分段标识符不能为空" })
    segmentIdentifier: string;

    @IsInt({ message: "子分段最大长度必须是整数" })
    @Min(50, { message: "子分段最大长度不能小于50" })
    @Max(8000, { message: "子分段最大长度不能超过8000" })
    @Transform(({ value }) => parseInt(value))
    maxSegmentLength: number;
}

/**
 * 知识库分段清洗 DTO
 */
export class IndexingSegmentsDto {
    @IsOptional()
    @IsString({ message: "文档处理模式必须是字符串" })
    documentMode?: "normal" | "hierarchical" = "normal";

    @IsOptional()
    @IsString({ message: "父块上下文模式必须是字符串" })
    parentContextMode?: "fullText" | "paragraph";

    @IsOptional()
    @ValidateNested()
    @Type(() => SegmentationDto)
    segmentation?: SegmentationDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => SubSegmentationDto)
    subSegmentation?: SubSegmentationDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => TextPreprocessingRulesDto)
    preprocessingRules?: TextPreprocessingRulesDto = new TextPreprocessingRulesDto();

    @IsArray({ message: "文件ID列表必须是数组" })
    @IsNotEmpty({ message: "文件ID列表不能为空" })
    @IsUUID("4", { each: true, message: "每个文件ID必须是有效的UUID" })
    fileIds: string[];
}

/**
 * 分段结果 DTO
 */
export class SegmentResultDto {
    content: string;
    index?: number;
    length?: number;
}

/**
 * 子块结果 DTO
 */
export class ChildSegmentDto {
    content: string;
    index: number;
    length: number;
}

/**
 * 父块结果 DTO
 */
export class ParentSegmentDto {
    content: string;
    index: number;
    length: number;
    children: ChildSegmentDto[];
}

/**
 * 单个文件的分段结果 DTO
 */
export class FileSegmentResultDto {
    fileId: string;
    fileName: string;
    segments: (SegmentResultDto | ParentSegmentDto)[];
    segmentCount: number;
}

/**
 * 知识库分段清洗响应 DTO
 */
export class IndexingSegmentsResponseDto {
    fileResults: FileSegmentResultDto[];
    totalSegments: number;
    processedFiles: number;
    processingTime: number;
}
