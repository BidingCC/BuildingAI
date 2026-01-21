import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateFeedbackDto {
    @IsUUID(undefined, { message: "消息ID必须是有效的UUID格式" })
    messageId: string;

    @IsEnum(["like", "dislike"], { message: "反馈类型必须是 like 或 dislike" })
    type: "like" | "dislike";

    @IsString({ message: "不喜欢的原因必须是字符串" })
    @IsOptional()
    dislikeReason?: string;
}

export class UpdateFeedbackDto {
    @IsEnum(["like", "dislike"], { message: "反馈类型必须是 like 或 dislike" })
    type: "like" | "dislike";

    @IsString({ message: "不喜欢的原因必须是字符串" })
    @IsOptional()
    dislikeReason?: string;
}
