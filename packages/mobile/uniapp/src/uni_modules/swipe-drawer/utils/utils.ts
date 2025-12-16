/**
 * @description 通用单位转换工具
 * @param value 原始数值或字符串
 * @returns 处理后的字符串
 */
export const convertUnit = (value: number | string): string => {
    return isNaN(value as unknown as number) ? `${value}` : `${value}rpx`;
};


