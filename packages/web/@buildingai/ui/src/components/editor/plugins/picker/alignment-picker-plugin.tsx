import { FORMAT_ELEMENT_COMMAND } from "lexical"
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
} from "lucide-react"

import { ComponentPickerOption } from "@buildingai/ui/components/editor/plugins/picker/component-picker-option"

export function AlignmentPickerPlugin({
  alignment,
}: {
  alignment: "left" | "center" | "right" | "justify"
}) {
  return new ComponentPickerOption(`Align ${alignment}`, {
    icon: <AlignIcons alignment={alignment} />,
    keywords: ["align", "justify", alignment],
    onSelect: (_, editor) =>
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment),
  })
}

function AlignIcons({
  alignment,
}: {
  alignment: "left" | "center" | "right" | "justify"
}) {
  switch (alignment) {
    case "left":
      return <AlignLeftIcon className="size-4" />
    case "center":
      return <AlignCenterIcon className="size-4" />
    case "right":
      return <AlignRightIcon className="size-4" />
    case "justify":
      return <AlignJustifyIcon className="size-4" />
  }
}
