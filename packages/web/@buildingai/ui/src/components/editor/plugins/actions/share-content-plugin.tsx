"use client"

import { useEffect } from "react"
import {
  editorStateFromSerializedDocument,
  SerializedDocument,
  serializedDocumentFromEditorState,
} from "@lexical/file"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { CLEAR_HISTORY_COMMAND } from "lexical"
import { SendIcon } from "lucide-react"
import { toast } from "sonner"

import {
  docFromHash,
  docToHash,
} from "@buildingai/ui/components/editor/utils/doc-serialization"
import { Button } from "@buildingai/ui/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@buildingai/ui/components/ui/tooltip"

export function ShareContentPlugin() {
  const [editor] = useLexicalComposerContext()
  async function shareDoc(doc: SerializedDocument): Promise<void> {
    const url = new URL(window.location.toString())
    url.hash = await docToHash(doc)
    const newUrl = url.toString()
    window.history.replaceState({}, "", newUrl)
    await window.navigator.clipboard.writeText(newUrl)
  }
  useEffect(() => {
    docFromHash(window.location.hash).then((doc) => {
      if (doc && doc.source === "editor") {
        editor.setEditorState(editorStateFromSerializedDocument(editor, doc))
        editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)
      }
    })
  }, [editor])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={"ghost"}
          onClick={() =>
            shareDoc(
              serializedDocumentFromEditorState(editor.getEditorState(), {
                source: "editor",
              })
            ).then(
              () => toast.success("URL copied to clipboard"),
              () => toast.error("URL could not be copied to clipboard")
            )
          }
          title="Share"
          aria-label="Share Playground link to current editor state"
          size={"sm"}
          className="p-2"
        >
          <SendIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Share Content</TooltipContent>
    </Tooltip>
  )
}
