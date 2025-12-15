import { IsObject } from "class-validator";

/**
 * Pages 配置 DTO
 * 用于接收前端传递的配置数据
 */
export class PagesConfigDto {
    /**
     * 配置内容
     * 由前端传递，可以是任意结构的数据
     */
    @IsObject({ message: "配置数据必须是对象格式" })
    [key: string]: any;
}
