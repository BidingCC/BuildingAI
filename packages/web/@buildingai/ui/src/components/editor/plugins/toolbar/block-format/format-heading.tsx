import { $createHeadingNode, HeadingTagType } from "@lexical/rich-text"
import { $setBlocksType } from "@lexical/selection"
import { $getSelection } from "lexical"

import { useToolbarContext } from "@buildingai/ui/components/editor/context/toolbar-context"
import { blockTypeToBlockName } from "@buildingai/ui/components/editor/plugins/toolbar/block-format/block-format-data"
import { SelectItem } from "@buildingai/ui/components/ui/select"

export function FormatHeading({ levels = [] }: { levels: HeadingTagType[] }) {
  const { activeEditor, blockType } = useToolbarContext()

  const formatHeading = (headingSize: HeadingTagType) => {
    if (blockType !== headingSize) {
      activeEditor.update(() => {
        const selection = $getSelection()
        $setBlocksType(selection, () => $createHeadingNode(headingSize))
      })
    }
  }

  return levels.map((level) => (
    <SelectItem
      key={level}
      value={level}
      onPointerDown={() => formatHeading(level)}
    >
      <div className="flex items-center gap-1 font-normal">
        {blockTypeToBlockName[level].icon}
        {blockTypeToBlockName[level].label}
      </div>
    </SelectItem>
  ))
}
