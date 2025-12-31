import { $createQuoteNode } from "@lexical/rich-text"
import { $setBlocksType } from "@lexical/selection"
import { $getSelection, $isRangeSelection } from "lexical"
import { QuoteIcon } from "lucide-react"

import { ComponentPickerOption } from "@buildingai/ui/components/editor/plugins/picker/component-picker-option"

export function QuotePickerPlugin() {
  return new ComponentPickerOption("Quote", {
    icon: <QuoteIcon className="size-4" />,
    keywords: ["block quote"],
    onSelect: (_, editor) =>
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode())
        }
      }),
  })
}
