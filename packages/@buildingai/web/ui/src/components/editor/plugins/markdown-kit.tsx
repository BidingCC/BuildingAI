import { MarkdownPlugin, remarkMdx, remarkMention } from "@platejs/markdown";
import type { SlatePlugin } from "platejs";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export const MarkdownKit: SlatePlugin[] = [
  MarkdownPlugin.configure({
    options: {
      plainMarks: [],
      remarkPlugins: [remarkMath, remarkGfm, remarkMdx, remarkMention],
    },
  }),
];
