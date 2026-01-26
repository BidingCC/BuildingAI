import { IsBoolean } from "class-validator";

export class SetPlansDto {
    @IsBoolean({ message: "状态必须为布尔值" })
    status: boolean;
}
