/**
 * 日期分组类型
 */
export type DateGroup = "pinned" | "today" | "yesterday" | "week" | "month" | "older";

/**
 * 分组后的对话数据结构
 */
export interface GroupedConversations<T = unknown> {
    label: string;
    key: DateGroup | string;
    items: T[];
}

/**
 * 获取日期的分组类型
 * @param date 日期字符串或Date对象
 * @returns 分组类型
 */
export function getDateGroup(date: string | Date): DateGroup | string {
    const targetDate = new Date(date);
    const now = new Date();

    // 重置时间到当天的0点，便于比较
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    const diffTime = today.getTime() - target.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return "today";
    } else if (diffDays === 1) {
        return "yesterday";
    } else if (diffDays <= 7) {
        return "week";
    } else if (diffDays <= 30) {
        return "month";
    } else {
        // 返回具体的年月，用于按月份分组
        return `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`;
    }
}

/**
 * 获取分组标签文本
 * @param groupKey 分组键
 * @param t 国际化函数
 * @returns 标签文本
 */
export function getGroupLabel(groupKey: DateGroup | string, t?: (key: string) => string): string {
    // 如果没有传入国际化函数，使用默认中文
    if (!t) {
        switch (groupKey) {
            case "pinned":
                return "置顶";
            case "today":
                return "今天";
            case "yesterday":
                return "昨天";
            case "week":
                return "7天内";
            case "month":
                return "30天内";
            default:
                // 处理年月格式的分组
                if (typeof groupKey === "string" && groupKey.includes("-")) {
                    const [year, month] = groupKey.split("-");
                    const monthNames = [
                        "1月",
                        "2月",
                        "3月",
                        "4月",
                        "5月",
                        "6月",
                        "7月",
                        "8月",
                        "9月",
                        "10月",
                        "11月",
                        "12月",
                    ];
                    const currentYear = new Date().getFullYear();
                    if (parseInt(year || "0") === currentYear) {
                        return monthNames[parseInt(month || "0") - 1] || "";
                    } else {
                        return `${year}年${monthNames[parseInt(month || "0") - 1]}`;
                    }
                }
                return groupKey;
        }
    }

    // 使用国际化函数
    switch (groupKey) {
        case "pinned":
            return "";
        case "today":
            return t("common.dateGroup.today");
        case "yesterday":
            return t("common.dateGroup.yesterday");
        case "week":
            return t("common.dateGroup.week");
        case "month":
            return t("common.dateGroup.month");
        default:
            // 处理年月格式的分组
            if (typeof groupKey === "string" && groupKey.includes("-")) {
                const [year, month] = groupKey.split("-");
                const monthKeys = [
                    "january",
                    "february",
                    "march",
                    "april",
                    "may",
                    "june",
                    "july",
                    "august",
                    "september",
                    "october",
                    "november",
                    "december",
                ];
                const currentYear = new Date().getFullYear();
                const monthName = t(
                    `common.dateGroup.months.${monthKeys[parseInt(month || "0") - 1]}`,
                );

                if (parseInt(year || "0") === currentYear) {
                    return monthName;
                } else {
                    return `${year}年${monthName}`;
                }
            }
            return groupKey;
    }
}

/**
 * 获取分组的排序权重（用于排序）
 * @param groupKey 分组键
 * @returns 排序权重，数字越小优先级越高
 */
export function getGroupWeight(groupKey: DateGroup | string): number {
    switch (groupKey) {
        case "pinned":
            return 0; // 置顶组权重最小，排在最前面
        case "today":
            return 1;
        case "yesterday":
            return 2;
        case "week":
            return 3;
        case "month":
            return 4;
        default:
            // 年月格式的分组，按时间倒序
            if (typeof groupKey === "string" && groupKey.includes("-")) {
                const [year, month] = groupKey.split("-");
                return 1000 + parseInt(year || "0") * 100 + parseInt(month || "0");
            }
            return 9999;
    }
}

/**
 * 按日期分组对话数据
 * @param conversations 对话数据数组
 * @param dateField 日期字段名，默认为 'updatedAt'
 * @param t 国际化函数
 * @returns 分组后的数据
 */
export function groupConversationsByDate<T>(
    conversations: T[],
    dateField: keyof T = "updatedAt" as keyof T,
    t?: (key: string) => string,
): GroupedConversations<T>[] {
    // 分离置顶和未置顶的对话
    const pinnedItems: T[] = [];
    const unpinnedItems: T[] = [];

    conversations.forEach((item) => {
        const isPinned = (item as { isPinned?: boolean }).isPinned ?? false;
        if (isPinned) {
            pinnedItems.push(item);
        } else {
            unpinnedItems.push(item);
        }
    });

    // 对未置顶的对话按日期分组
    const groups = new Map<string, T[]>();

    unpinnedItems.forEach((item) => {
        const groupKey = getDateGroup(item[dateField] as string | Date);
        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
        }
        const group = groups.get(groupKey);
        if (group) {
            group.push(item);
        }
    });

    // 构建结果数组
    const result: GroupedConversations<T>[] = [];

    // 如果有置顶的对话，添加置顶组
    if (pinnedItems.length > 0) {
        result.push({
            label: getGroupLabel("pinned", t),
            key: "pinned",
            items: pinnedItems.sort((a, b) => {
                // 置顶组内按更新时间倒序
                return (
                    new Date(b[dateField] as string | Date).getTime() -
                    new Date(a[dateField] as string | Date).getTime()
                );
            }),
        });
    }

    // 添加按日期分组的对话
    const dateGroups = Array.from(groups.entries())
        .map(([key, items]) => ({
            label: getGroupLabel(key, t),
            key,
            items: items.sort((a, b) => {
                // 组内按更新时间倒序
                return (
                    new Date(b[dateField] as string | Date).getTime() -
                    new Date(a[dateField] as string | Date).getTime()
                );
            }),
        }))
        .sort((a, b) => {
            // 组间按权重排序
            return getGroupWeight(a.key) - getGroupWeight(b.key);
        });

    result.push(...dateGroups);

    return result;
}

/**
 * 格式化相对时间
 * @param date 日期字符串或Date对象
 * @param t 国际化函数
 * @returns 格式化后的时间字符串
 */
export function formatRelativeTime(date: string | Date, t?: (key: string) => string): string {
    const targetDate = new Date(date);
    const now = new Date();
    const diffTime = now.getTime() - targetDate.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // 如果没有传入国际化函数，使用默认中文
    if (!t) {
        if (diffMinutes < 1) {
            return "刚刚";
        } else if (diffMinutes < 60) {
            return `${diffMinutes}分钟前`;
        } else if (diffHours < 24) {
            return `${diffHours}小时前`;
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            // 超过7天显示具体日期
            return targetDate.toLocaleDateString("zh-CN", {
                month: "numeric",
                day: "numeric",
            });
        }
    }

    // 使用国际化函数
    if (diffMinutes < 1) {
        return t("console-common.time.justNow");
    } else if (diffMinutes < 60) {
        return `${diffMinutes}${t("console-common.time.minutesAgo")}`;
    } else if (diffHours < 24) {
        return `${diffHours}${t("console-common.time.hoursAgo")}`;
    } else if (diffDays < 7) {
        return `${diffDays}${t("console-common.time.daysAgo")}`;
    } else {
        // 超过7天显示具体日期
        return targetDate.toLocaleDateString("zh-CN", {
            month: "numeric",
            day: "numeric",
        });
    }
}

/**
 * 格式化具体时间
 * @param date 日期字符串或Date对象
 * @param showYear 是否显示年份
 * @returns 格式化后的时间字符串
 */
export function formatDateTime(date: string | Date, showYear: boolean = false): string {
    const targetDate = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    };

    if (showYear) {
        options.year = "numeric";
    }

    return targetDate.toLocaleDateString("zh-CN", options);
}
