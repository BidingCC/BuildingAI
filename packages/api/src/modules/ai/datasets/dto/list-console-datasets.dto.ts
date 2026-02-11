import { SquarePublishStatus } from "@buildingai/db/entities";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

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

    @IsOptional()
    @IsUUID("4")
    tagId?: string;
}
