import type { LanguageModelV3 } from "@ai-sdk/provider";

import { transformMessages } from "./message-transformer";
import type { MessageContent } from "./types";

interface ModelMethodArgs {
    messages?: Array<{ content?: MessageContent; [key: string]: unknown }>;
    prompt?:
        | Array<{ content?: MessageContent; [key: string]: unknown }>
        | { content?: MessageContent; [key: string]: unknown };
    [key: string]: unknown;
}

export function wrapLanguageModel(baseModel: LanguageModelV3): LanguageModelV3 {
    return new Proxy(baseModel, {
        get(target, prop) {
            const value = target[prop as keyof LanguageModelV3];

            if (prop === "doStream" || prop === "doGenerate") {
                return function (args: ModelMethodArgs) {
                    if (args.messages && Array.isArray(args.messages)) {
                        const transformed = transformMessages(args.messages);
                        args = {
                            ...args,
                            messages: transformed as Array<{
                                content?: MessageContent;
                                [key: string]: unknown;
                            }>,
                        };
                    }

                    if (args.prompt) {
                        const promptArray = Array.isArray(args.prompt)
                            ? args.prompt
                            : [args.prompt];
                        const transformed = transformMessages(promptArray);
                        args = {
                            ...args,
                            prompt: Array.isArray(args.prompt)
                                ? (transformed as Array<{
                                      content?: MessageContent;
                                      [key: string]: unknown;
                                  }>)
                                : (transformed[0] as {
                                      content?: MessageContent;
                                      [key: string]: unknown;
                                  }),
                        };
                    }

                    console.log("args", JSON.stringify(args));

                    return (value as (args: ModelMethodArgs) => never).call(target, args);
                };
            }

            return value;
        },
    });
}
