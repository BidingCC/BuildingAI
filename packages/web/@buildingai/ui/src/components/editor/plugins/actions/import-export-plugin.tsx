import { exportFile, importFile } from "@lexical/file"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { DownloadIcon, UploadIcon } from "lucide-react"

import { Button } from "@buildingai/ui/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@buildingai/ui/components/ui/tooltip"

export function ImportExportPlugin() {
  const [editor] = useLexicalComposerContext()
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={"ghost"}
            onClick={() => importFile(editor)}
            title="Import"
            aria-label="Import editor state from JSON"
            size={"sm"}
            className="p-2"
          >
            <UploadIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Import Content</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={"ghost"}
            onClick={() =>
              exportFile(editor, {
                fileName: `Playground ${new Date().toISOString()}`,
                source: "Playground",
              })
            }
            title="Export"
            aria-label="Export editor state to JSON"
            size={"sm"}
            className="p-2"
          >
            <DownloadIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export Content</TooltipContent>
      </Tooltip>
    </>
  )
}
