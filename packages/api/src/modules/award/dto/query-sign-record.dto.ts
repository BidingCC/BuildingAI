import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { IsOptional, IsString } from "class-validator";

export class QuerySignRecordDto extends PaginationDto {
    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @IsString()
    startTime?: string;

    @IsOptional()
    @IsString()
    endTime?: string;
}
