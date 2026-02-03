import { IsOptional, IsString } from "class-validator";

export class RejectSquarePublishDto {
    @IsOptional()
    @IsString()
    reason?: string;
}
