import { INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list"
import { ListIcon } from "lucide-react"

import { ComponentPickerOption } from "@buildingai/ui/components/editor/plugins/picker/component-picker-option"

export function BulletedListPickerPlugin() {
  return new ComponentPickerOption("Bulleted List", {
    icon: <ListIcon className="size-4" />,
    keywords: ["bulleted list", "unordered list", "ul"],
    onSelect: (_, editor) =>
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
  })
}
