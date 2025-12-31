"use client"

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin"
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
} from "lexical"
import { createPortal } from "react-dom"

import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@buildingai/ui/components/ui/command"

const LexicalTypeaheadMenuPlugin = dynamic(
  () =>
    import("@lexical/react/LexicalTypeaheadMenuPlugin").then(
      (mod) => mod.LexicalTypeaheadMenuPlugin<EmojiOption>
    ),
  { ssr: false }
)

class EmojiOption extends MenuOption {
  title: string
  emoji: string
  keywords: Array<string>

  constructor(
    title: string,
    emoji: string,
    options: {
      keywords?: Array<string>
    }
  ) {
    super(title)
    this.title = title
    this.emoji = emoji
    this.keywords = options.keywords || []
  }
}

type Emoji = {
  emoji: string
  description: string
  category: string
  aliases: Array<string>
  tags: Array<string>
  unicode_version: string
  ios_version: string
  skin_tones?: boolean
}

const MAX_EMOJI_SUGGESTION_COUNT = 10

export function EmojiPickerPlugin() {
  const [editor] = useLexicalComposerContext()
  const [queryString, setQueryString] = useState<string | null>(null)
  const [emojis, setEmojis] = useState<Array<Emoji>>([])
  const [isOpen, setIsOpen] = useState(false)
  useEffect(() => {
    import("../utils/emoji-list").then((file) => setEmojis(file.default))
  }, [])

  const emojiOptions = useMemo(
    () =>
      emojis != null
        ? emojis.map(
            ({ emoji, aliases, tags }) =>
              new EmojiOption(aliases[0], emoji, {
                keywords: [...aliases, ...tags],
              })
          )
        : [],
    [emojis]
  )

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch(":", {
    minLength: 0,
  })

  const options: Array<EmojiOption> = useMemo(() => {
    return emojiOptions
      .filter((option: EmojiOption) => {
        return queryString != null
          ? new RegExp(queryString, "gi").exec(option.title) ||
            option.keywords != null
            ? option.keywords.some((keyword: string) =>
                new RegExp(queryString, "gi").exec(keyword)
              )
            : false
          : emojiOptions
      })
      .slice(0, MAX_EMOJI_SUGGESTION_COUNT)
  }, [emojiOptions, queryString])

  const onSelectOption = useCallback(
    (
      selectedOption: EmojiOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void
    ) => {
      editor.update(() => {
        const selection = $getSelection()

        if (!$isRangeSelection(selection) || selectedOption == null) {
          return
        }

        if (nodeToRemove) {
          nodeToRemove.remove()
        }

        selection.insertNodes([$createTextNode(selectedOption.emoji)])

        closeMenu()
      })
    },
    [editor]
  )

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      onOpen={() => {
        setIsOpen(true)
      }}
      onClose={() => {
        setIsOpen(false)
      }}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) => {
        return anchorElementRef.current && options.length
          ? createPortal(
              <div className="fixed z-10 w-[200px] rounded-md shadow-md">
                <Command
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault()
                      setHighlightedIndex(
                        selectedIndex !== null
                          ? (selectedIndex - 1 + options.length) %
                              options.length
                          : options.length - 1
                      )
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault()
                      setHighlightedIndex(
                        selectedIndex !== null
                          ? (selectedIndex + 1) % options.length
                          : 0
                      )
                    }
                  }}
                >
                  <CommandList>
                    <CommandGroup>
                      {options.map((option, index) => (
                        <CommandItem
                          key={option.key}
                          value={option.title}
                          onSelect={() => {
                            selectOptionAndCleanUp(option)
                          }}
                          className={`flex items-center gap-2 ${
                            selectedIndex === index
                              ? "bg-accent"
                              : "!bg-transparent"
                          }`}
                        >
                          {option.emoji} {option.title}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>,
              anchorElementRef.current
            )
          : null
      }}
    />
  )
}
