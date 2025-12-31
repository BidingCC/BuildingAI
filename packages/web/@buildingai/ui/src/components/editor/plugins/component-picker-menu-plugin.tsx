import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useBasicTypeaheadTriggerMatch } from "@lexical/react/LexicalTypeaheadMenuPlugin"
import { TextNode } from "lexical"
import { createPortal } from "react-dom"

import { useEditorModal } from "@buildingai/ui/components/editor/editor-hooks/use-modal"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@buildingai/ui/components/ui/command"

import { ComponentPickerOption } from "./picker/component-picker-option"

const LexicalTypeaheadMenuPlugin = dynamic(
  () =>
    import("@lexical/react/LexicalTypeaheadMenuPlugin").then(
      (mod) => mod.LexicalTypeaheadMenuPlugin<ComponentPickerOption>
    ),
  { ssr: false }
)

function ComponentPickerMenu({
  options,
  selectedIndex,
  selectOptionAndCleanUp,
  setHighlightedIndex,
}: {
  options: Array<ComponentPickerOption>
  selectedIndex: number | null
  selectOptionAndCleanUp: (option: ComponentPickerOption) => void
  setHighlightedIndex: (index: number) => void
}) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (selectedIndex !== null && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      })
    }
  }, [selectedIndex])

  return (
    <div className="absolute z-10 h-min w-[250px] rounded-md shadow-md">
      <Command
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault()
            setHighlightedIndex(
              selectedIndex !== null
                ? (selectedIndex - 1 + options.length) % options.length
                : options.length - 1
            )
          } else if (e.key === "ArrowDown") {
            e.preventDefault()
            setHighlightedIndex(
              selectedIndex !== null ? (selectedIndex + 1) % options.length : 0
            )
          }
        }}
      >
        <CommandList>
          <CommandGroup>
            {options.map((option, index) => (
              <CommandItem
                key={option.key}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                value={option.title}
                onSelect={() => {
                  selectOptionAndCleanUp(option)
                }}
                className={`flex items-center gap-2 ${
                  selectedIndex === index ? "bg-accent" : "!bg-transparent"
                }`}
              >
                {option.icon}
                {option.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}

export function ComponentPickerMenuPlugin({
  baseOptions = [],
  dynamicOptionsFn,
}: {
  baseOptions?: Array<ComponentPickerOption>
  dynamicOptionsFn?: ({
    queryString,
  }: {
    queryString: string
  }) => Array<ComponentPickerOption>
}): JSX.Element {
  const [editor] = useLexicalComposerContext()
  const [modal, showModal] = useEditorModal()
  const [queryString, setQueryString] = useState<string | null>(null)

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  })

  const options = useMemo(() => {
    if (!queryString) {
      return baseOptions
    }

    const regex = new RegExp(queryString, "i")

    return [
      ...(dynamicOptionsFn?.({ queryString }) || []),
      ...baseOptions.filter(
        (option) =>
          regex.test(option.title) ||
          option.keywords.some((keyword) => regex.test(keyword))
      ),
    ]
  }, [editor, queryString, showModal])

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string
    ) => {
      editor.update(() => {
        nodeToRemove?.remove()
        selectedOption.onSelect(matchingString, editor, showModal)
        closeMenu()
      })
    },
    [editor]
  )

  return (
    <>
      {modal}
      <LexicalTypeaheadMenuPlugin
        onQueryChange={setQueryString}
        onSelectOption={onSelectOption}
        triggerFn={checkForTriggerMatch}
        options={options}
        menuRenderFn={(
          anchorElementRef,
          { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
        ) => {
          return anchorElementRef.current && options.length
            ? createPortal(
                <ComponentPickerMenu
                  options={options}
                  selectedIndex={selectedIndex}
                  selectOptionAndCleanUp={selectOptionAndCleanUp}
                  setHighlightedIndex={setHighlightedIndex}
                />,
                anchorElementRef.current
              )
            : null
        }}
      />
    </>
  )
}
