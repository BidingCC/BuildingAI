import {
    calculateDueMembershipGiftCycle,
    calculateMembershipGiftExpireAt,
} from "./membership-gift-cycle";

function localDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
    return new Date(year, month - 1, day, hour, minute, 0, 0);
}

describe("membership gift cycle", () => {
    it("expires a one-month membership gift at the membership end time, not 30 days later at midnight", () => {
        const startTime = localDate(2026, 3, 25, 13, 57);
        const endTime = localDate(2026, 4, 25, 13, 57);

        const expireAt = calculateMembershipGiftExpireAt(startTime, endTime);

        expect(expireAt).toEqual(endTime);
    });

    it("does not grant a new cycle on the day before the monthly anniversary", () => {
        const cycle = calculateDueMembershipGiftCycle({
            subscriptionStartTime: localDate(2026, 3, 25, 13, 57),
            subscriptionEndTime: localDate(2026, 4, 25, 13, 57),
            grantDate: localDate(2026, 4, 24),
            lastGrantedCycle: 0,
        });

        expect(cycle).toBeNull();
    });

    it("does not grant a new cycle when the subscription ends at that cycle boundary", () => {
        const cycle = calculateDueMembershipGiftCycle({
            subscriptionStartTime: localDate(2026, 3, 25, 13, 57),
            subscriptionEndTime: localDate(2026, 4, 25, 13, 57),
            grantDate: localDate(2026, 4, 25),
            lastGrantedCycle: 0,
        });

        expect(cycle).toBeNull();
    });

    it("grants the next cycle when the subscription has been extended beyond the anniversary", () => {
        const cycle = calculateDueMembershipGiftCycle({
            subscriptionStartTime: localDate(2026, 3, 25, 13, 57),
            subscriptionEndTime: localDate(2026, 5, 25, 13, 57),
            grantDate: localDate(2026, 4, 25),
            lastGrantedCycle: 0,
        });

        expect(cycle).toBe(1);
    });
});
