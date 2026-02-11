"use client";

import { cn } from "@buildingai/ui/lib/utils";
import {
  type CursorData,
  type CursorOverlayState,
  useCursorOverlay,
} from "@platejs/selection/react";
import { getTableGridAbove } from "@platejs/table";
import { RangeApi } from "platejs";
import { useEditorRef } from "platejs/react";
import * as React from "react";

export function CursorOverlay() {
  const { cursors } = useCursorOverlay();

  return (
    <>
      {cursors.map((cursor) => (
        <Cursor key={cursor.id} {...cursor} />
      ))}
    </>
  );
}

function Cursor({
  id,
  caretPosition,
  data,
  selection,
  selectionRects,
}: CursorOverlayState<CursorData>) {
  const editor = useEditorRef();
  const { style, selectionStyle = style } = data ?? ({} as CursorData);
  const isCursor = RangeApi.isCollapsed(selection);

  // Skip overlay for multi-cell table selection (table has its own selection UI)
  if (id === "selection" && selection) {
    const cellEntries = getTableGridAbove(editor, {
      at: selection,
      format: "cell",
    });

    if (cellEntries.length > 1) {
      return null;
    }
  }

  return (
    <>
      {selectionRects.map((position, i) => (
        <div
          key={i}
          className={cn(
            "pointer-events-none absolute z-10",
            id === "selection" && "bg-brand/25",
            id === "selection" && isCursor && "bg-primary",
          )}
          style={{
            ...selectionStyle,
            ...position,
          }}
        />
      ))}
      {caretPosition && (
        <div
          className={cn(
            "pointer-events-none absolute z-10 w-0.5",
            id === "drag" && "bg-brand w-px",
          )}
          style={{ ...caretPosition, ...style }}
        />
      )}
    </>
  );
}
