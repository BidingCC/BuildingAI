import { cn } from "@buildingai/ui/lib/utils";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import * as React from "react";

export function CalloutElementStatic({ children, className, ...props }: SlateElementProps) {
  return (
    <SlateElement
      className={cn("bg-muted my-1 flex rounded-sm p-4 pl-3", className)}
      style={{
        backgroundColor: props.element.backgroundColor as any,
      }}
      {...props}
    >
      <div className="flex w-full gap-2 rounded-md">
        <div
          className="size-6 text-[18px] select-none"
          style={{
            fontFamily:
              '"Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji, "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", EmojiSymbols',
          }}
        >
          <span data-plate-prevent-deserialization>{(props.element.icon as any) || "💡"}</span>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </SlateElement>
  );
}

/**
 * DOCX-compatible callout component using table layout for side-by-side icon and content.
 */
export function CalloutElementDocx({ children, ...props }: SlateElementProps) {
  const backgroundColor = (props.element.backgroundColor as string) || "#f4f4f5";
  const icon = (props.element.icon as string) || "💡";

  return (
    <SlateElement {...props}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "none",
          backgroundColor,
          borderRadius: "4px",
          marginTop: "4pt",
          marginBottom: "4pt",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                width: "30px",
                verticalAlign: "top",
                padding: "8px 4px 8px 8px",
                border: "none",
                fontSize: "18px",
                fontFamily:
                  '"Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji, "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", EmojiSymbols',
              }}
            >
              <span data-plate-prevent-deserialization>{icon}</span>
            </td>
            <td
              style={{
                verticalAlign: "top",
                padding: "8px 8px 8px 4px",
                border: "none",
              }}
            >
              {children}
            </td>
          </tr>
        </tbody>
      </table>
    </SlateElement>
  );
}
