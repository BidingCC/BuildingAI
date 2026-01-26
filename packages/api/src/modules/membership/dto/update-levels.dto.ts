import { PartialType } from "@nestjs/mapped-types";
import { IsBoolean, IsNumber, IsOptional } from "class-validator";

import { CreateLevelsDto } from "./create-levels.dto";

export class UpdateLevelsDto extends PartialType(CreateLevelsDto) {
    @IsBoolean()
    @IsOptional()
    status?: boolean;

    @IsNumber()
    @IsOptional()
    sort?: number;
}
