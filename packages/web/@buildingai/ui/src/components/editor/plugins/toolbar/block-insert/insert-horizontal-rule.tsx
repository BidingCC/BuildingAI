"use client"

import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode"
import { ScissorsIcon } from "lucide-react"

import { useToolbarContext } from "@buildingai/ui/components/editor/context/toolbar-context"
import { SelectItem } from "@buildingai/ui/components/ui/select"

export function InsertHorizontalRule() {
  const { activeEditor } = useToolbarContext()

  return (
    <SelectItem
      value="horizontal-rule"
      onPointerUp={() =>
        activeEditor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
      }
      className=""
    >
      <div className="flex items-center gap-1">
        <ScissorsIcon className="size-4" />
        <span>Horizontal Rule</span>
      </div>
    </SelectItem>
  )
}
