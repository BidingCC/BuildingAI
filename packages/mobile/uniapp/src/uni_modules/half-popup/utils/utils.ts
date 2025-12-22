/**
 * @description 转换单位
 * @param {String | Number} value 值 100
 */
export const convertUnit = (value: number | string):  string => {
    return isNaN(value as unknown as number) ? `${value}` : `${value}rpx`;
}