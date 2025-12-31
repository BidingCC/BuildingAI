import { INSERT_CHECK_LIST_COMMAND } from "@lexical/list"
import { ListTodoIcon } from "lucide-react"

import { ComponentPickerOption } from "@buildingai/ui/components/editor/plugins/picker/component-picker-option"

export function CheckListPickerPlugin() {
  return new ComponentPickerOption("Check List", {
    icon: <ListTodoIcon className="size-4" />,
    keywords: ["check list", "todo list"],
    onSelect: (_, editor) =>
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
  })
}
