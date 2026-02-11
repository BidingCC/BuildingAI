import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";

export class RejectSquarePublishDto {
    @IsOptional()
    @IsString()
    reason?: string;
}

export class PublishToSquareDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID("4", { each: true })
    tagIds: string[];

    @IsOptional()
    @IsBoolean()
    memberJoinApprovalRequired?: boolean;
}
