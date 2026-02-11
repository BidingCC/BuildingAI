import { Transform, Type } from "class-transformer";
import { Allow, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class ListSquareDatasetsDto {
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
    keyword?: string;

    @IsOptional()
    @Transform(({ value, obj }) => {
        const v = value ?? (obj as Record<string, unknown>)["tagIds[]"];
        return Array.isArray(v) ? v : v ? [v] : undefined;
    })
    @IsArray()
    @IsUUID("4", { each: true })
    tagIds?: string[];

    @Allow()
    @IsOptional()
    "tagIds[]"?: unknown;
}
