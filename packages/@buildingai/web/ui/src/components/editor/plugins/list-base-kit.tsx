import { BaseIndentKit } from "@buildingai/ui/components/editor/plugins/indent-base-kit";
import { BaseListPlugin } from "@platejs/list";
import { KEYS } from "platejs";

import { BlockListStatic } from "../ui/block-list-static";

export const BaseListKit = [
  ...BaseIndentKit,
  BaseListPlugin.configure({
    inject: {
      targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote, KEYS.codeBlock, KEYS.toggle],
    },
    render: {
      belowNodes: BlockListStatic,
    },
  }),
];
