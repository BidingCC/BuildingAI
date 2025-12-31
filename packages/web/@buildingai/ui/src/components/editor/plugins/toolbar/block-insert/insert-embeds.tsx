import { INSERT_EMBED_COMMAND } from "@lexical/react/LexicalAutoEmbedPlugin"

import { useToolbarContext } from "@buildingai/ui/components/editor/context/toolbar-context"
import { EmbedConfigs } from "@buildingai/ui/components/editor/plugins/embeds/auto-embed-plugin"
import { SelectItem } from "@buildingai/ui/components/ui/select"

export function InsertEmbeds() {
  const { activeEditor } = useToolbarContext()
  return EmbedConfigs.map((embedConfig) => (
    <SelectItem
      key={embedConfig.type}
      value={embedConfig.type}
      onPointerUp={() => {
        activeEditor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type)
      }}
      className=""
    >
      <div className="flex items-center gap-1">
        {embedConfig.icon}
        <span>{embedConfig.contentName}</span>
      </div>
    </SelectItem>
  ))
}
