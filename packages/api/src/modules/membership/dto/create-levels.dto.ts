import { IsArray, IsNumber, IsOptional, IsString, Min } from "class-validator";

interface Benefits {
    icon: string;
    content: string;
}

export class CreateLevelsDto {
    @IsString({ message: "等级名称必须是字符串" })
    name: string;

    @IsString({ message: "等级图标必须是字符串" })
    @IsOptional()
    icon?: string;

    @IsNumber({}, { message: "等级级别必须是数字" })
    @Min(1, { message: "等级级别必须大于等于1" })
    level: number;

    @IsNumber({}, { message: "等级赠送积分必须是数字" })
    @IsOptional()
    givePower?: number;

    @IsString({ message: "等级描述必须是字符串" })
    @IsOptional()
    description?: string;

    @IsArray({ message: "等级权益必须是数组" })
    @IsOptional()
    benefits?: Benefits[];
}
