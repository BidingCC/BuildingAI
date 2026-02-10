import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class ListDatasetsDto {
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
