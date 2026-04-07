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
    title: "sidebar.membership.title",
    description: "sidebar.membership.description",
    backPath: "/console/operation",
    icon: Crown,
    menuItems: [
      {
        path: "level",
        label: "sidebar.membership.levels",
        icon: Crown,
        permissions: "levels:list",
      },
      {
        path: "plan",
        label: "sidebar.membership.plans",
        icon: CalendarCheck,
        permissions: "plans:list",
      },
    ],
  },
  recharge: {
    title: "sidebar.recharge.title",
    description: "sidebar.recharge.description",
    backPath: "/console/operation",
    icon: Wallet,
    menuItems: [
      {
        path: "config",
        label: "sidebar.recharge.rechargeManage",
        icon: Bolt,
        permissions: "recharge-config:getConfig",
      },
    ],
  },
  cdk: {
    title: "sidebar.cdk.title",
    description: "sidebar.cdk.description",
    backPath: "/console/operation",
    icon: CreditCard,
    menuItems: [
      {
        path: "management",
        label: "sidebar.cdk.cdkManage",
        icon: KeyRound,
        permissions: "card-batch:list",
      },
      {
        path: "records",
        label: "sidebar.cdk.usageRecords",
        icon: History,
        permissions: "card-key:used-list",
      },
      {
        path: "settings",
        label: "sidebar.cdk.cdkSettings",
        icon: Settings2,
        permissions: "card-setting:get",
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
