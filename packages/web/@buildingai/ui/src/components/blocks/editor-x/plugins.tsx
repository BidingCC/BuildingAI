import { useState } from "react";
import {
    CHECK_LIST,
    ELEMENT_TRANSFORMERS,
    MULTILINE_ELEMENT_TRANSFORMERS,
    TEXT_FORMAT_TRANSFORMERS,
    TEXT_MATCH_TRANSFORMERS,
} from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";

import { ContentEditable } from "@buildingai/ui/components/editor/editor-ui/content-editable";
import { ActionsPlugin } from "@buildingai/ui/components/editor/plugins/actions/actions-plugin";
import { CharacterLimitPlugin } from "@buildingai/ui/components/editor/plugins/actions/character-limit-plugin";
import { ClearEditorActionPlugin } from "@buildingai/ui/components/editor/plugins/actions/clear-editor-plugin";
import { CounterCharacterPlugin } from "@buildingai/ui/components/editor/plugins/actions/counter-character-plugin";
import { EditModeTogglePlugin } from "@buildingai/ui/components/editor/plugins/actions/edit-mode-toggle-plugin";
import { ImportExportPlugin } from "@buildingai/ui/components/editor/plugins/actions/import-export-plugin";
import { MarkdownTogglePlugin } from "@buildingai/ui/components/editor/plugins/actions/markdown-toggle-plugin";
import { MaxLengthPlugin } from "@buildingai/ui/components/editor/plugins/actions/max-length-plugin";
import { ShareContentPlugin } from "@buildingai/ui/components/editor/plugins/actions/share-content-plugin";
import { SpeechToTextPlugin } from "@buildingai/ui/components/editor/plugins/actions/speech-to-text-plugin";
import { TreeViewPlugin } from "@buildingai/ui/components/editor/plugins/actions/tree-view-plugin";
import { AutoLinkPlugin } from "@buildingai/ui/components/editor/plugins/auto-link-plugin";
import { AutocompletePlugin } from "@buildingai/ui/components/editor/plugins/autocomplete-plugin";
import { CodeActionMenuPlugin } from "@buildingai/ui/components/editor/plugins/code-action-menu-plugin";
import { CodeHighlightPlugin } from "@buildingai/ui/components/editor/plugins/code-highlight-plugin";
import { ComponentPickerMenuPlugin } from "@buildingai/ui/components/editor/plugins/component-picker-menu-plugin";
import { ContextMenuPlugin } from "@buildingai/ui/components/editor/plugins/context-menu-plugin";
import { DragDropPastePlugin } from "@buildingai/ui/components/editor/plugins/drag-drop-paste-plugin";
import { DraggableBlockPlugin } from "@buildingai/ui/components/editor/plugins/draggable-block-plugin";
import { AutoEmbedPlugin } from "@buildingai/ui/components/editor/plugins/embeds/auto-embed-plugin";
import { TwitterPlugin } from "@buildingai/ui/components/editor/plugins/embeds/twitter-plugin";
import { YouTubePlugin } from "@buildingai/ui/components/editor/plugins/embeds/youtube-plugin";
import { EmojiPickerPlugin } from "@buildingai/ui/components/editor/plugins/emoji-picker-plugin";
import { EmojisPlugin } from "@buildingai/ui/components/editor/plugins/emojis-plugin";
import { FloatingLinkEditorPlugin } from "@buildingai/ui/components/editor/plugins/floating-link-editor-plugin";
import { FloatingTextFormatToolbarPlugin } from "@buildingai/ui/components/editor/plugins/floating-text-format-plugin";
import { ImagesPlugin } from "@buildingai/ui/components/editor/plugins/images-plugin";
import { KeywordsPlugin } from "@buildingai/ui/components/editor/plugins/keywords-plugin";
import { LayoutPlugin } from "@buildingai/ui/components/editor/plugins/layout-plugin";
import { LinkPlugin } from "@buildingai/ui/components/editor/plugins/link-plugin";
import { ListMaxIndentLevelPlugin } from "@buildingai/ui/components/editor/plugins/list-max-indent-level-plugin";
import { MentionsPlugin } from "@buildingai/ui/components/editor/plugins/mentions-plugin";
import { AlignmentPickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/alignment-picker-plugin";
import { BulletedListPickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/bulleted-list-picker-plugin";
import { CheckListPickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/check-list-picker-plugin";
import { CodePickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/code-picker-plugin";
import { ColumnsLayoutPickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/columns-layout-picker-plugin";
import { DividerPickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/divider-picker-plugin";
import { EmbedsPickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/embeds-picker-plugin";
import { HeadingPickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/heading-picker-plugin";
import { ImagePickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/image-picker-plugin";
import { NumberedListPickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/numbered-list-picker-plugin";
import { ParagraphPickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/paragraph-picker-plugin";
import { QuotePickerPlugin } from "@buildingai/ui/components/editor/plugins/picker/quote-picker-plugin";
import {
    DynamicTablePickerPlugin,
    TablePickerPlugin,
} from "@buildingai/ui/components/editor/plugins/picker/table-picker-plugin";
import { TabFocusPlugin } from "@buildingai/ui/components/editor/plugins/tab-focus-plugin";
import { BlockFormatDropDown } from "@buildingai/ui/components/editor/plugins/toolbar/block-format-toolbar-plugin";
import { FormatBulletedList } from "@buildingai/ui/components/editor/plugins/toolbar/block-format/format-bulleted-list";
import { FormatCheckList } from "@buildingai/ui/components/editor/plugins/toolbar/block-format/format-check-list";
import { FormatCodeBlock } from "@buildingai/ui/components/editor/plugins/toolbar/block-format/format-code-block";
import { FormatHeading } from "@buildingai/ui/components/editor/plugins/toolbar/block-format/format-heading";
import { FormatNumberedList } from "@buildingai/ui/components/editor/plugins/toolbar/block-format/format-numbered-list";
import { FormatParagraph } from "@buildingai/ui/components/editor/plugins/toolbar/block-format/format-paragraph";
import { FormatQuote } from "@buildingai/ui/components/editor/plugins/toolbar/block-format/format-quote";
import { BlockInsertPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/block-insert-plugin";
import { InsertColumnsLayout } from "@buildingai/ui/components/editor/plugins/toolbar/block-insert/insert-columns-layout";
import { InsertEmbeds } from "@buildingai/ui/components/editor/plugins/toolbar/block-insert/insert-embeds";
import { InsertHorizontalRule } from "@buildingai/ui/components/editor/plugins/toolbar/block-insert/insert-horizontal-rule";
import { InsertImage } from "@buildingai/ui/components/editor/plugins/toolbar/block-insert/insert-image";
import { InsertTable } from "@buildingai/ui/components/editor/plugins/toolbar/block-insert/insert-table";
import { ClearFormattingToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/clear-formatting-toolbar-plugin";
import { CodeLanguageToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/code-language-toolbar-plugin";
import { ElementFormatToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/element-format-toolbar-plugin";
import { FontBackgroundToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/font-background-toolbar-plugin";
import { FontColorToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/font-color-toolbar-plugin";
import { FontFamilyToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/font-family-toolbar-plugin";
import { FontFormatToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/font-format-toolbar-plugin";
import { FontSizeToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/font-size-toolbar-plugin";
import { HistoryToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/history-toolbar-plugin";
import { LinkToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/link-toolbar-plugin";
import { SubSuperToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/subsuper-toolbar-plugin";
import { ToolbarPlugin } from "@buildingai/ui/components/editor/plugins/toolbar/toolbar-plugin";
import { TypingPerfPlugin } from "@buildingai/ui/components/editor/plugins/typing-pref-plugin";
import { EMOJI } from "@buildingai/ui/components/editor/transformers/markdown-emoji-transformer";
import { HR } from "@buildingai/ui/components/editor/transformers/markdown-hr-transformer";
import { IMAGE } from "@buildingai/ui/components/editor/transformers/markdown-image-transformer";
import { TABLE } from "@buildingai/ui/components/editor/transformers/markdown-table-transformer";
import { TWEET } from "@buildingai/ui/components/editor/transformers/markdown-tweet-transformer";
import { Separator } from "@buildingai/ui/components/ui/separator";

const placeholder = "Press / for commands...";
const maxLength = 500;

export function Plugins() {
    const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
    const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

    const onRef = (_floatingAnchorElem: HTMLDivElement) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem);
        }
    };

    return (
        <div className="relative">
            <ToolbarPlugin>
                {({ blockType }) => (
                    <div className="vertical-align-middle sticky top-0 z-10 flex items-center gap-2 overflow-auto border-b p-1">
                        <HistoryToolbarPlugin />
                        <Separator orientation="vertical" className="!h-7" />
                        <BlockFormatDropDown>
                            <FormatParagraph />
                            <FormatHeading levels={["h1", "h2", "h3"]} />
                            <FormatNumberedList />
                            <FormatBulletedList />
                            <FormatCheckList />
                            <FormatCodeBlock />
                            <FormatQuote />
                        </BlockFormatDropDown>
                        {blockType === "code" ? (
                            <CodeLanguageToolbarPlugin />
                        ) : (
                            <>
                                <FontFamilyToolbarPlugin />
                                <FontSizeToolbarPlugin />
                                <Separator orientation="vertical" className="!h-7" />
                                <FontFormatToolbarPlugin />
                                <Separator orientation="vertical" className="!h-7" />
                                <SubSuperToolbarPlugin />
                                <LinkToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
                                <Separator orientation="vertical" className="!h-7" />
                                <ClearFormattingToolbarPlugin />
                                <Separator orientation="vertical" className="!h-7" />
                                <FontColorToolbarPlugin />
                                <FontBackgroundToolbarPlugin />
                                <Separator orientation="vertical" className="!h-7" />
                                <ElementFormatToolbarPlugin />
                                <Separator orientation="vertical" className="!h-7" />
                                <BlockInsertPlugin>
                                    <InsertHorizontalRule />
                                    <InsertImage />
                                    <InsertTable />
                                    <InsertColumnsLayout />
                                    <InsertEmbeds />
                                </BlockInsertPlugin>
                            </>
                        )}
                    </div>
                )}
            </ToolbarPlugin>
            <div className="relative">
                <AutoFocusPlugin />
                <RichTextPlugin
                    contentEditable={
                        <div className="">
                            <div className="" ref={onRef}>
                                <ContentEditable
                                    placeholder={placeholder}
                                    className="ContentEditable__root relative block h-[calc(100vh-90px)] min-h-72 overflow-auto px-8 py-4 focus:outline-none"
                                />
                            </div>
                        </div>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                />

                <ClickableLinkPlugin />
                <CheckListPlugin />
                <HorizontalRulePlugin />
                <TablePlugin />
                <ListPlugin />
                <TabIndentationPlugin />
                <HashtagPlugin />
                <HistoryPlugin />

                <MentionsPlugin />
                <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                <KeywordsPlugin />
                <EmojisPlugin />
                <ImagesPlugin />

                <LayoutPlugin />

                <AutoEmbedPlugin />
                <TwitterPlugin />
                <YouTubePlugin />

                <CodeHighlightPlugin />
                <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />

                <MarkdownShortcutPlugin
                    transformers={[
                        TABLE,
                        HR,
                        IMAGE,
                        EMOJI,
                        TWEET,
                        CHECK_LIST,
                        ...ELEMENT_TRANSFORMERS,
                        ...MULTILINE_ELEMENT_TRANSFORMERS,
                        ...TEXT_FORMAT_TRANSFORMERS,
                        ...TEXT_MATCH_TRANSFORMERS,
                    ]}
                />
                <TypingPerfPlugin />
                <TabFocusPlugin />
                <AutocompletePlugin />
                <AutoLinkPlugin />
                <LinkPlugin />

                <ComponentPickerMenuPlugin
                    baseOptions={[
                        ParagraphPickerPlugin(),
                        HeadingPickerPlugin({ n: 1 }),
                        HeadingPickerPlugin({ n: 2 }),
                        HeadingPickerPlugin({ n: 3 }),
                        TablePickerPlugin(),
                        CheckListPickerPlugin(),
                        NumberedListPickerPlugin(),
                        BulletedListPickerPlugin(),
                        QuotePickerPlugin(),
                        CodePickerPlugin(),
                        DividerPickerPlugin(),
                        EmbedsPickerPlugin({ embed: "tweet" }),
                        EmbedsPickerPlugin({ embed: "youtube-video" }),
                        ImagePickerPlugin(),
                        ColumnsLayoutPickerPlugin(),
                        AlignmentPickerPlugin({ alignment: "left" }),
                        AlignmentPickerPlugin({ alignment: "center" }),
                        AlignmentPickerPlugin({ alignment: "right" }),
                        AlignmentPickerPlugin({ alignment: "justify" }),
                    ]}
                    dynamicOptionsFn={DynamicTablePickerPlugin}
                />

                <ContextMenuPlugin />
                <DragDropPastePlugin />
                <EmojiPickerPlugin />

                <FloatingLinkEditorPlugin
                    anchorElem={floatingAnchorElem}
                    isLinkEditMode={isLinkEditMode}
                    setIsLinkEditMode={setIsLinkEditMode}
                />
                <FloatingTextFormatToolbarPlugin
                    anchorElem={floatingAnchorElem}
                    setIsLinkEditMode={setIsLinkEditMode}
                />

                <ListMaxIndentLevelPlugin />
            </div>
            <ActionsPlugin>
                <div className="clear-both flex items-center justify-between gap-2 overflow-auto border-t p-1">
                    <div className="flex flex-1 justify-start">
                        <MaxLengthPlugin maxLength={maxLength} />
                        <CharacterLimitPlugin maxLength={maxLength} charset="UTF-16" />
                    </div>
                    <div>
                        <CounterCharacterPlugin charset="UTF-16" />
                    </div>
                    <div className="flex flex-1 justify-end">
                        <SpeechToTextPlugin />
                        <ShareContentPlugin />
                        <ImportExportPlugin />
                        <MarkdownTogglePlugin
                            shouldPreserveNewLinesInMarkdown={true}
                            transformers={[
                                TABLE,
                                HR,
                                IMAGE,
                                EMOJI,
                                TWEET,
                                CHECK_LIST,
                                ...ELEMENT_TRANSFORMERS,
                                ...MULTILINE_ELEMENT_TRANSFORMERS,
                                ...TEXT_FORMAT_TRANSFORMERS,
                                ...TEXT_MATCH_TRANSFORMERS,
                            ]}
                        />
                        <EditModeTogglePlugin />
                        <>
                            <ClearEditorActionPlugin />
                            <ClearEditorPlugin />
                        </>
                        <TreeViewPlugin />
                    </div>
                </div>
            </ActionsPlugin>
        </div>
    );
}
