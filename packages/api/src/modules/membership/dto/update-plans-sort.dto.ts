import { IsNumber } from "class-validator";

export class UpdatePlansSortDto {
    @IsNumber({}, { message: "排序必须是数字" })
    sort: number;
}
