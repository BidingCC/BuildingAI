import type { LucideIcon } from "lucide-react";
import {
  Bolt,
  CalendarCheck,
  CreditCard,
  Crown,
  History,
  KeyRound,
  Settings2,
  Wallet,
} from "lucide-react";

/**
 * 侧边栏菜单项配置
 */
export interface SidebarMenuItem {
  /** 路径（相对于工具基础路径） */
  path: string;
  /** 菜单标签 */
  label: string;
  /** 菜单图标 */
  icon: LucideIcon;
  /** 菜单权限 */
  permissions: string | string[];
}

/**
 * 侧边栏配置
 */
export interface SidebarConfig {
  /** 侧边栏标题 */
  title: string;
  /** 侧边栏描述 */
  description: string;
  /** 返回路径 */
  backPath: string;
  /** 工具图标 */
  icon: LucideIcon;
  /** 菜单项列表 */
  menuItems: SidebarMenuItem[];
}

/**
 * 营销工具侧边栏配置映射
 * key: 工具路径标识（如 'cdk', 'points-task'）
 */
export const sidebarConfigMap: Record<string, SidebarConfig> = {
  membership: {
    title: "会员订阅",
    description: "自行设置订阅规则",
    backPath: "/console/operation",
    icon: Crown,
    menuItems: [
      { path: "level", label: "会员等级", icon: Crown, permissions: "levels:list" },
      { path: "plan", label: "订阅计划", icon: CalendarCheck, permissions: "plans:list" },
    ],
  },
  recharge: {
    title: "积分充值",
    description: "多充多送 增加复购",
    backPath: "/console/operation",
    icon: Wallet,
    menuItems: [
      {
        path: "config",
        label: "充值管理",
        icon: Bolt,
        permissions: "recharge-config:getConfig",
      },
    ],
  },
  cdk: {
    title: "卡密兑换",
    description: "批量生成卡密",
    backPath: "/console/operation",
    icon: CreditCard,
    menuItems: [
      {
        path: "management",
        label: "卡密管理",
        icon: KeyRound,
        permissions: "card-batch:list",
      },
      {
        path: "records",
        label: "使用记录",
        icon: History,
        permissions: "card-key:used-list",
      },
      {
        path: "settings",
        label: "卡密设置",
        icon: Settings2,
        permissions: "card-setting:get",
      },
    ],
  },
  "login-reward": {
    title: "登录奖励",
    description: "每日登录赠送积分",
    backPath: "/console/operation",
    icon: Wallet,
    menuItems: [
      { path: "config", label: "登录奖励", icon: Bolt, permissions: "award:get-login-award" },
    ],
  },
  "register-reward": {
    title: "注册奖励",
    description: "新用户注册赠送积分",
    backPath: "/console/operation",
    icon: Wallet,
    menuItems: [
      { path: "config", label: "注册奖励", icon: Bolt, permissions: "award:get-register-award" },
    ],
  },
  "sign-reward": {
    title: "签到奖励",
    description: "用户每日签到领取积分",
    backPath: "/console/operation",
    icon: Wallet,
    menuItems: [
      { path: "config", label: "签到设置", icon: Bolt, permissions: "award:get-sign-award" },
      {
        path: "records",
        label: "签到记录",
        icon: History,
        permissions: "award-record:sign-record-list",
      },
    ],
  },
  //   "points-task": {
  //     title: "积分任务",
  //     description: "积分任务管理",
  //     backPath: "/console/operation",
  //     iconUrl: "http://localhost:4090/static/avatars/24.png",
  //     menuItems: [
  //       { path: "login-reward", label: "登录/注册奖励", icon: LogIn },
  //       { path: "invite-reward", label: "邀新奖励", icon: UserPlus },
  //       { path: "share-reward", label: "分享奖励", icon: Share2 },
  //       { path: "task-settings", label: "任务设置", icon: Settings2 },
  //     ],
  //   },
};
