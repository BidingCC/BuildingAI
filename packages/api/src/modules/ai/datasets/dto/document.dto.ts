import { Type } from "class-transformer";
import {
    ArrayMinSize,
    IsArray,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    ValidateIf,
} from "class-validator";

export const DOCUMENT_SORT_BY_VALUES = ["name", "size", "uploadTime"] as const;
export type DocumentSortBy = (typeof DOCUMENT_SORT_BY_VALUES)[number];

export class CreateDocumentDto {
    @ValidateIf((o) => !o.url?.trim())
    @IsUUID("4", { message: "fileId 必须是有效的 UUID" })
    @IsOptional()
    fileId?: string;

    @ValidateIf((o) => !o.fileId)
    @IsString({ message: "url 必须是字符串" })
    @IsNotEmpty({ message: "url 不能为空" })
    @IsOptional()
    url?: string;
}

export class ListDocumentsDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    pageSize?: number = 20;

    @IsOptional()
    @IsString()
    @IsIn(DOCUMENT_SORT_BY_VALUES)
    sortBy?: DocumentSortBy = "uploadTime";

    @IsOptional()
    @IsString()
    keyword?: string;
}

export class BatchDeleteDocumentsDto {
    @IsArray({ message: "documentIds 必须是数组" })
    @ArrayMinSize(1, { message: "documentIds 至少包含一个文档ID" })
    @IsUUID("4", { each: true, message: "documentIds 中每一项必须是有效的 UUID" })
    documentIds: string[];
}

export class BatchMoveDocumentsDto {
    @IsArray({ message: "documentIds 必须是数组" })
    @ArrayMinSize(1, { message: "documentIds 至少包含一个文档ID" })
    @IsUUID("4", { each: true, message: "documentIds 中每一项必须是有效的 UUID" })
    documentIds: string[];

    @IsUUID("4", { message: "targetDatasetId 必须是有效的 UUID" })
    targetDatasetId: string;
}

export class BatchCopyDocumentsDto {
    @IsArray({ message: "documentIds 必须是数组" })
    @ArrayMinSize(1, { message: "documentIds 至少包含一个文档ID" })
    @IsUUID("4", { each: true, message: "documentIds 中每一项必须是有效的 UUID" })
    documentIds: string[];

    @IsUUID("4", { message: "targetDatasetId 必须是有效的 UUID" })
    targetDatasetId: string;
}

export class BatchAddTagsDto {
    @IsArray({ message: "documentIds 必须是数组" })
    @ArrayMinSize(1, { message: "documentIds 至少包含一个文档ID" })
    @IsUUID("4", { each: true, message: "documentIds 中每一项必须是有效的 UUID" })
    documentIds: string[];

    @IsArray({ message: "tags 必须是数组" })
    @ArrayMinSize(1, { message: "tags 至少包含一个标签" })
    @IsString({ each: true, message: "tags 中每一项必须是字符串" })
    tags: string[];
}

export class UpdateDocumentTagsDto {
    @IsArray({ message: "tags 必须是数组" })
    @IsString({ each: true, message: "tags 中每一项必须是字符串" })
    tags: string[];
}
