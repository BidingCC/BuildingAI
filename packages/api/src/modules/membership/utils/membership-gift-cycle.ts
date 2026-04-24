const MAX_MEMBERSHIP_GIFT_CYCLES = 1200;

function getLocalDayStart(date: Date): Date {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    return dayStart;
}

function getLocalDayEnd(date: Date): Date {
    const dayEnd = getLocalDayStart(date);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return dayEnd;
}

export function getMembershipGiftCycleStart(subscriptionStartTime: Date, cycle: number): Date {
    const cycleStart = new Date(subscriptionStartTime);
    cycleStart.setMonth(cycleStart.getMonth() + cycle);
    return cycleStart;
}

export function calculateMembershipGiftExpireAt(
    subscriptionStartTime: Date,
    subscriptionEndTime: Date,
    cycle = 0,
): Date {
    const nextCycleStart = getMembershipGiftCycleStart(subscriptionStartTime, cycle + 1);

    return nextCycleStart > subscriptionEndTime ? new Date(subscriptionEndTime) : nextCycleStart;
}

export function calculateDueMembershipGiftCycle({
    subscriptionStartTime,
    subscriptionEndTime,
    grantDate,
    lastGrantedCycle,
}: {
    subscriptionStartTime: Date;
    subscriptionEndTime: Date;
    grantDate: Date;
    lastGrantedCycle: number;
}): number | null {
    const grantDayEnd = getLocalDayEnd(grantDate);
    const firstCandidateCycle = Math.max(1, lastGrantedCycle + 1);
    let dueCycle: number | null = null;

    for (let cycle = firstCandidateCycle; cycle <= MAX_MEMBERSHIP_GIFT_CYCLES; cycle += 1) {
        const cycleStart = getMembershipGiftCycleStart(subscriptionStartTime, cycle);

        if (cycleStart >= subscriptionEndTime || cycleStart >= grantDayEnd) {
            break;
        }

        dueCycle = cycle;
    }

    return dueCycle;
}
