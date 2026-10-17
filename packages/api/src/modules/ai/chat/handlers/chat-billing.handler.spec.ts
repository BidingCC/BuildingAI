// The handlers only need AppBillingService's two methods; keep the DB/ESM graph out of the unit test.
jest.mock("@buildingai/core/modules", () => ({ AppBillingService: class {} }));
jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: { badRequest: (message: string) => new Error(message) },
}));

import { AgentBillingHandler } from "../../agents/handlers/agent-billing";
import { ChatBillingHandler } from "./chat-billing.handler";

const rule = { power: 1, tokens: 1000 };

function step(totalTokens: number) {
    return { usage: { inputTokens: totalTokens - 10, outputTokens: 10, totalTokens } };
}

function fakeBilling(balance: number) {
    const calls: Array<Record<string, unknown>> = [];
    let power = balance;
    return {
        calls,
        get power() {
            return power;
        },
        getSpendablePower: async () => power,
        // Mirrors BaseBillingService.deductUserPower: all-or-nothing unless allowPartial.
        deductUserPower: async (opts: { amount: number; allowPartial?: boolean }) => {
            calls.push(opts);
            if (power < opts.amount && !opts.allowPartial) throw new Error("余额不足");
            const deducted = Math.min(power, opts.amount);
            power -= deducted;
            return deducted;
        },
    };
}

describe.each([
    ["chat", (b: any) => new ChatBillingHandler(b)],
    ["agent", (b: any) => new AgentBillingHandler(b)],
])("%s billing settles the whole delivered turn", (_name, make) => {
    it("admission is sized by the prompt, not a fixed 500-token estimate", () => {
        const handler = make(fakeBilling(1));
        expect(() => handler.assertBudgetCoversPrompt(1, 400, rule)).not.toThrow();
        expect(() => handler.assertBudgetCoversPrompt(1, 20_000, rule)).toThrow("积分不足");
        expect(() => handler.assertBudgetCoversPrompt(undefined, 20_000, rule)).not.toThrow();
    });

    it("admission returns the spendable balance as the turn budget", async () => {
        const handler = make(fakeBilling(7));
        await expect(handler.validateUserPower("u1", rule)).resolves.toBe(7);
        await expect(handler.validateUserPower("u1", { power: 0, tokens: 1000 })).resolves.toBe(
            undefined,
        );
    });

    it("stops the tool loop before a step the admitted budget cannot pay", () => {
        const handler = make(fakeBilling(50));
        const stop = handler.stopWhenBudgetExhausted(50, rule) as (o: { steps: any[] }) => boolean;
        expect(stop({ steps: [step(20_000)] })).toBe(false);
        expect(stop({ steps: [step(20_000), step(20_100)] })).toBe(true);
        const unbilled = handler.stopWhenBudgetExhausted(undefined, rule) as (o: {
            steps: any[];
        }) => boolean;
        expect(unbilled({ steps: [step(1_000_000)] })).toBe(false);
    });

    it("a turn that costs more than the balance takes the balance instead of nothing", async () => {
        const billing = fakeBilling(1);
        const handler = make(billing);
        const charged = await handler.deduct({
            userId: "u1",
            conversationId: "c1",
            usage: { inputTokens: 199_000, outputTokens: 1_000, totalTokens: 200_000 },
            billingRule: rule,
        });
        expect(billing.calls[0]).toMatchObject({ amount: 200, allowPartial: true });
        expect(charged).toBe(1);
        expect(billing.power).toBe(0);
    });

    it("a funded turn is charged in full", async () => {
        const billing = fakeBilling(500);
        const handler = make(billing);
        await expect(
            handler.deduct({
                userId: "u1",
                conversationId: "c1",
                usage: { totalTokens: 200_000 },
                billingRule: rule,
            }),
        ).resolves.toBe(200);
        expect(billing.power).toBe(300);
    });
});
