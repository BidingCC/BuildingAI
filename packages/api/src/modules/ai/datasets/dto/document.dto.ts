import { Type } from "class-transformer";
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    ValidateIf,
} from "class-validator";

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
}
