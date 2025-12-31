"use client"

import { useCallback, useState } from "react"
import {
  $isCodeNode,
  CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  CODE_LANGUAGE_MAP,
  getLanguageFriendlyName,
} from "@lexical/code"
import { $isListNode } from "@lexical/list"
import { $findMatchingParent } from "@lexical/utils"
import {
  $getNodeByKey,
  $isRangeSelection,
  $isRootOrShadowRoot,
  BaseSelection,
} from "lexical"

import { useToolbarContext } from "@buildingai/ui/components/editor/context/toolbar-context"
import { useUpdateToolbarHandler } from "@buildingai/ui/components/editor/editor-hooks/use-update-toolbar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@buildingai/ui/components/ui/select"

function getCodeLanguageOptions(): [string, string][] {
  const options: [string, string][] = []

  for (const [lang, friendlyName] of Object.entries(
    CODE_LANGUAGE_FRIENDLY_NAME_MAP
  )) {
    options.push([lang, friendlyName])
  }

  return options
}

const CODE_LANGUAGE_OPTIONS = getCodeLanguageOptions()

export function CodeLanguageToolbarPlugin() {
  const { activeEditor } = useToolbarContext()
  const [codeLanguage, setCodeLanguage] = useState<string>("")
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(
    null
  )

  const $updateToolbar = (selection: BaseSelection) => {
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode()
      let element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent()
              return parent !== null && $isRootOrShadowRoot(parent)
            })

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow()
      }

      const elementKey = element.getKey()
      const elementDOM = activeEditor.getElementByKey(elementKey)

      if (elementDOM !== null) {
        setSelectedElementKey(elementKey)

        if (!$isListNode(element) && $isCodeNode(element)) {
          const language =
            element.getLanguage() as keyof typeof CODE_LANGUAGE_MAP
          setCodeLanguage(
            language ? CODE_LANGUAGE_MAP[language] || language : ""
          )
          return
        }
      }
    }
  }

  useUpdateToolbarHandler($updateToolbar)

  const onCodeLanguageSelect = useCallback(
    (value: string) => {
      activeEditor.update(() => {
        if (selectedElementKey !== null) {
          const node = $getNodeByKey(selectedElementKey)
          if ($isCodeNode(node)) {
            node.setLanguage(value)
          }
        }
      })
    },
    [activeEditor, selectedElementKey]
  )

  return (
    <Select>
      <SelectTrigger className="!h-8 w-min gap-1">
        <span>
          {getLanguageFriendlyName(codeLanguage) || "Select Language"}
        </span>
      </SelectTrigger>
      <SelectContent>
        {CODE_LANGUAGE_OPTIONS.map(([value, label]) => (
          <SelectItem
            key={value}
            value={value}
            onPointerUp={() => {
              onCodeLanguageSelect(value)
            }}
          >
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
