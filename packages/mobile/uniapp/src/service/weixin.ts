/**
 * @fileoverview Web API service functions for weixin management
 * @description This file contains API functions for weixin management and related type definitions for the mobile frontend.
 *
 * @author BuildingAI Teams
 */

/**
 * WeChat Mini Program bind wechat
 * @description Bind wechat with WeChat Mini Program using code obtained from wx.login()
 * @param code Login code obtained from wx.login() API
 * @returns Promise with bind result
 */
export function apiBindWechat(data: { code: string }): Promise<{ message: string }> {
    return useWebPost<{ message: string }>("/auth/bind-wechat", data);
}
