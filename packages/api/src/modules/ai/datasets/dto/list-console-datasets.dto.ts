import { SquarePublishStatus } from "@buildingai/db/entities";
import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

import { PaginationDto } from "@buildingai/dto/pagination.dto";

const STATUS_VALUES = [
    "all",
    SquarePublishStatus.NONE,
    SquarePublishStatus.PENDING,
    SquarePublishStatus.APPROVED,
    SquarePublishStatus.REJECTED,
] as const;

export class ListConsoleDatasetsDto extends PaginationDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsIn(STATUS_VALUES)
    status?: (typeof STATUS_VALUES)[number];
}
