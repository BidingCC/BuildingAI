import type { JSX } from "react"
import { useMemo } from "react"
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  NodeContextMenuOption,
  NodeContextMenuPlugin,
  NodeContextMenuSeparator,
} from "@lexical/react/LexicalNodeContextMenuPlugin"
import {
  $getSelection,
  $isDecoratorNode,
  $isNodeSelection,
  $isRangeSelection,
  COPY_COMMAND,
  CUT_COMMAND,
  PASTE_COMMAND,
  type LexicalNode,
} from "lexical"
import {
  Clipboard,
  ClipboardType,
  Copy,
  Link2Off,
  Scissors,
  Trash2,
} from "lucide-react"

export function ContextMenuPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext()

  const items = useMemo(() => {
    return [
      new NodeContextMenuOption(`Remove Link`, {
        $onSelect: () => {
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
        },
        $showOn: (node: LexicalNode) => $isLinkNode(node.getParent()),
        disabled: false,
        icon: <Link2Off className="h-4 w-4" />,
      }),
      new NodeContextMenuSeparator({
        $showOn: (node: LexicalNode) => $isLinkNode(node.getParent()),
      }),
      new NodeContextMenuOption(`Cut`, {
        $onSelect: () => {
          editor.dispatchCommand(CUT_COMMAND, null)
        },
        disabled: false,
        icon: <Scissors className="h-4 w-4" />,
      }),
      new NodeContextMenuOption(`Copy`, {
        $onSelect: () => {
          editor.dispatchCommand(COPY_COMMAND, null)
        },
        disabled: false,
        icon: <Copy className="h-4 w-4" />,
      }),
      new NodeContextMenuOption(`Paste`, {
        $onSelect: () => {
          navigator.clipboard.read().then(async function (...args) {
            const data = new DataTransfer()

            const readClipboardItems = await navigator.clipboard.read()
            const item = readClipboardItems[0]

            const permission = await navigator.permissions.query({
              // @ts-expect-error These types are incorrect.
              name: "clipboard-read",
            })
            if (permission.state === "denied") {
              alert("Not allowed to paste from clipboard.")
              return
            }

            for (const type of item.types) {
              const dataString = await (await item.getType(type)).text()
              data.setData(type, dataString)
            }

            const event = new ClipboardEvent("paste", {
              clipboardData: data,
            })

            editor.dispatchCommand(PASTE_COMMAND, event)
          })
        },
        disabled: false,
        icon: <Clipboard className="h-4 w-4" />,
      }),
      new NodeContextMenuOption(`Paste as Plain Text`, {
        $onSelect: () => {
          navigator.clipboard.read().then(async function (...args) {
            const permission = await navigator.permissions.query({
              // @ts-expect-error These types are incorrect.
              name: "clipboard-read",
            })

            if (permission.state === "denied") {
              alert("Not allowed to paste from clipboard.")
              return
            }

            const data = new DataTransfer()
            const clipboardText = await navigator.clipboard.readText()
            data.setData("text/plain", clipboardText)

            const event = new ClipboardEvent("paste", {
              clipboardData: data,
            })
            editor.dispatchCommand(PASTE_COMMAND, event)
          })
        },
        disabled: false,
        icon: <ClipboardType className="h-4 w-4" />,
      }),
      new NodeContextMenuSeparator(),
      new NodeContextMenuOption(`Delete Node`, {
        $onSelect: () => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            const currentNode = selection.anchor.getNode()
            const ancestorNodeWithRootAsParent = currentNode.getParents().at(-2)

            ancestorNodeWithRootAsParent?.remove()
          } else if ($isNodeSelection(selection)) {
            const selectedNodes = selection.getNodes()
            selectedNodes.forEach((node) => {
              if ($isDecoratorNode(node)) {
                node.remove()
              }
            })
          }
        },
        disabled: false,
        icon: <Trash2 className="h-4 w-4" />,
      }),
    ]
  }, [editor])

  return (
    <NodeContextMenuPlugin
      className="bg-popover text-popover-foreground !z-50 overflow-hidden rounded-md border shadow-md outline-none [&:has(*)]:!z-10"
      itemClassName="relative w-full flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
      separatorClassName="bg-border -mx-1 h-px"
      items={items}
    />
  )
}
