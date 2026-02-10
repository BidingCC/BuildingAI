import { AnnotationReviewStatus } from "@buildingai/db/entities";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Length,
} from "class-validator";

export class AnnotationBaseDto {
    @IsNotEmpty({ message: "标注问题不能为空" })
    @IsString({ message: "标注问题必须是字符串" })
    @Length(1, 1000, { message: "标注问题长度必须在1-1000字符之间" })
    question: string;

    @IsNotEmpty({ message: "标注答案不能为空" })
    @IsString({ message: "标注答案必须是字符串" })
    @Length(1, 5000, { message: "标注答案长度必须在1-5000字符之间" })
    answer: string;

    @IsOptional()
    @IsBoolean({ message: "是否启用必须是布尔值" })
    enabled?: boolean = true;
}

export class CreateAnnotationDto extends AnnotationBaseDto {
    @IsNotEmpty({ message: "智能体ID不能为空" })
    @IsUUID(4, { message: "智能体ID必须是有效的UUID" })
    agentId: string;

    @IsOptional()
    @IsUUID(4, { message: "创建者ID必须是有效的UUID" })
    createBy?: string;
}

export class UpdateAnnotationDto extends AnnotationBaseDto {}

export class QueryAnnotationDto extends PaginationDto {
    @IsOptional()
    @IsUUID(4, { message: "智能体ID必须是有效的UUID" })
    agentId?: string;

    @IsOptional()
    @IsString({ message: "搜索关键词必须是字符串" })
    keyword?: string;

    @IsOptional()
    @IsBoolean({ message: "是否启用必须是布尔值" })
    enabled?: boolean;

    @IsOptional()
    @IsString({ message: "排序方式必须是字符串" })
    sortBy?: "createdAt" | "updatedAt";
}

export class CreateAgentAnnotationDto extends CreateAnnotationDto {
    @IsOptional()
    @IsUUID(4, { message: "消息ID必须是有效的UUID" })
    messageId?: string;
}

export class QueryAgentAnnotationDto extends QueryAnnotationDto {
    @IsOptional()
    @IsEnum(AnnotationReviewStatus, {
        message: "审核状态必须是 pending、approved 或 rejected",
    })
    reviewStatus?: AnnotationReviewStatus;
}

export class UpdateAgentAnnotationDto extends UpdateAnnotationDto {
    @IsOptional()
    @IsUUID(4, { message: "消息ID必须是有效的UUID" })
    messageId?: string;
}

export class ReviewAnnotationDto {
    @IsNotEmpty({ message: "审核状态不能为空" })
    @IsEnum(AnnotationReviewStatus, {
        message: "审核状态必须是 pending、approved 或 rejected",
    })
    reviewStatus: AnnotationReviewStatus;

    @IsOptional()
    @IsUUID(4, { message: "审核者ID必须是有效的UUID" })
    reviewerId?: string;
}
