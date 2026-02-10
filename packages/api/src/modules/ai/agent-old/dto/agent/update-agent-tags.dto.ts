import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

/**
 * 批量添加/删除智能体标签 DTO
 */
export class AgentTagsDto {
    /** 标签ID 列表 */
    @IsArray({ message: "标签ID必须为数组" })
    @ArrayNotEmpty({ message: "标签ID不能为空" })
    @IsString({ each: true, message: "每个标签ID必须为字符串" })
    tagIds: string[];
}
