import { useState } from "react"
import { $isLinkNode } from "@lexical/link"
import { $findMatchingParent } from "@lexical/utils"
import {
  $isElementNode,
  $isRangeSelection,
  BaseSelection,
  ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from "lexical"
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  IndentDecreaseIcon,
  IndentIncreaseIcon,
} from "lucide-react"

import { useToolbarContext } from "@buildingai/ui/components/editor/context/toolbar-context"
import { useUpdateToolbarHandler } from "@buildingai/ui/components/editor/editor-hooks/use-update-toolbar"
import { getSelectedNode } from "@buildingai/ui/components/editor/utils/get-selected-node"
import { Separator } from "@buildingai/ui/components/ui/separator"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@buildingai/ui/components/ui/toggle-group"

const ELEMENT_FORMAT_OPTIONS: {
  [key in Exclude<ElementFormatType, "start" | "end" | "">]: {
    icon: React.ReactNode
    iconRTL: string
    name: string
  }
} = {
  left: {
    icon: <AlignLeftIcon className="size-4" />,
    iconRTL: "left-align",
    name: "Left Align",
  },
  center: {
    icon: <AlignCenterIcon className="size-4" />,
    iconRTL: "center-align",
    name: "Center Align",
  },
  right: {
    icon: <AlignRightIcon className="size-4" />,
    iconRTL: "right-align",
    name: "Right Align",
  },
  justify: {
    icon: <AlignJustifyIcon className="size-4" />,
    iconRTL: "justify-align",
    name: "Justify Align",
  },
} as const

export function ElementFormatToolbarPlugin({
  separator = true,
}: {
  separator?: boolean
}) {
  const { activeEditor } = useToolbarContext()
  const [elementFormat, setElementFormat] = useState<ElementFormatType>("left")

  const $updateToolbar = (selection: BaseSelection) => {
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection)
      const parent = node.getParent()

      let matchingParent
      if ($isLinkNode(parent)) {
        // If node is a link, we need to fetch the parent paragraph node to set format
        matchingParent = $findMatchingParent(
          node,
          (parentNode) => $isElementNode(parentNode) && !parentNode.isInline()
        )
      }
      setElementFormat(
        $isElementNode(matchingParent)
          ? matchingParent.getFormatType()
          : $isElementNode(node)
            ? node.getFormatType()
            : parent?.getFormatType() || "left"
      )
    }
  }

  useUpdateToolbarHandler($updateToolbar)

  const handleValueChange = (value: string) => {
    if (!value) return // Prevent unselecting current value

    setElementFormat(value as ElementFormatType)

    if (value === "indent") {
      activeEditor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)
    } else if (value === "outdent") {
      activeEditor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)
    } else {
      activeEditor.dispatchCommand(
        FORMAT_ELEMENT_COMMAND,
        value as ElementFormatType
      )
    }
  }

  return (
    <>
      <ToggleGroup
        type="single"
        value={elementFormat}
        defaultValue={elementFormat}
        onValueChange={handleValueChange}
      >
        {/* Alignment toggles */}
        {Object.entries(ELEMENT_FORMAT_OPTIONS).map(([value, option]) => (
          <ToggleGroupItem
            key={value}
            value={value}
            variant={"outline"}
            size="sm"
            aria-label={option.name}
          >
            {option.icon}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {separator && <Separator orientation="vertical" className="!h-7" />}
      {/* Indentation toggles */}
      <ToggleGroup
        type="single"
        value={elementFormat}
        defaultValue={elementFormat}
        onValueChange={handleValueChange}
      >
        <ToggleGroupItem
          value="outdent"
          aria-label="Outdent"
          variant={"outline"}
          size="sm"
        >
          <IndentDecreaseIcon className="size-4" />
        </ToggleGroupItem>

        <ToggleGroupItem
          value="indent"
          variant={"outline"}
          aria-label="Indent"
          size="sm"
        >
          <IndentIncreaseIcon className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </>
  )
}
