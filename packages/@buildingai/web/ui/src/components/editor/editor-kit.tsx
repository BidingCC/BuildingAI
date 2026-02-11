"use client";

import { AlignKit } from "@buildingai/ui/components/editor/plugins/align-kit";
import { AutoformatKit } from "@buildingai/ui/components/editor/plugins/autoformat-kit";
import { BasicBlocksKit } from "@buildingai/ui/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@buildingai/ui/components/editor/plugins/basic-marks-kit";
import { BlockMenuKit } from "@buildingai/ui/components/editor/plugins/block-menu-kit";
import { BlockPlaceholderKit } from "@buildingai/ui/components/editor/plugins/block-placeholder-kit";
import { CalloutKit } from "@buildingai/ui/components/editor/plugins/callout-kit";
import { CodeBlockKit } from "@buildingai/ui/components/editor/plugins/code-block-kit";
import { ColumnKit } from "@buildingai/ui/components/editor/plugins/column-kit";
import { CursorOverlayKit } from "@buildingai/ui/components/editor/plugins/cursor-overlay-kit";
import { DateKit } from "@buildingai/ui/components/editor/plugins/date-kit";
import { DndKit } from "@buildingai/ui/components/editor/plugins/dnd-kit";
import { DocxKit } from "@buildingai/ui/components/editor/plugins/docx-kit";
import { EmojiKit } from "@buildingai/ui/components/editor/plugins/emoji-kit";
import { ExitBreakKit } from "@buildingai/ui/components/editor/plugins/exit-break-kit";
import { FixedToolbarKit } from "@buildingai/ui/components/editor/plugins/fixed-toolbar-kit";
import { FloatingToolbarKit } from "@buildingai/ui/components/editor/plugins/floating-toolbar-kit";
import { FontKit } from "@buildingai/ui/components/editor/plugins/font-kit";
import { LineHeightKit } from "@buildingai/ui/components/editor/plugins/line-height-kit";
import { LinkKit } from "@buildingai/ui/components/editor/plugins/link-kit";
import { ListKit } from "@buildingai/ui/components/editor/plugins/list-kit";
import { MarkdownKit } from "@buildingai/ui/components/editor/plugins/markdown-kit";
import { MathKit } from "@buildingai/ui/components/editor/plugins/math-kit";
import { MediaKit } from "@buildingai/ui/components/editor/plugins/media-kit";
import { MentionKit } from "@buildingai/ui/components/editor/plugins/mention-kit";
import { SlashKit } from "@buildingai/ui/components/editor/plugins/slash-kit";
import { TableKit } from "@buildingai/ui/components/editor/plugins/table-kit";
import { TocKit } from "@buildingai/ui/components/editor/plugins/toc-kit";
import { ToggleKit } from "@buildingai/ui/components/editor/plugins/toggle-kit";
import { TrailingBlockPlugin, type Value } from "platejs";
import { type TPlateEditor, useEditorRef } from "platejs/react";

export const EditorKit = [
  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,
  ...MentionKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...BlockMenuKit,
  ...DndKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...DocxKit,
  ...MarkdownKit,

  // UI
  ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = (): MyEditor => useEditorRef<MyEditor>();
