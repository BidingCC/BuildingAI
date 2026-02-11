import { cn } from "@buildingai/ui/lib/utils";
import type { TMentionElement } from "platejs";
import { KEYS } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import * as React from "react";

export function MentionElementStatic(
  props: SlateElementProps<TMentionElement> & {
    prefix?: string;
  },
) {
  const { prefix } = props;
  const element = props.element;

  return (
    <SlateElement
      {...props}
      as="span"
      className={cn(
        "bg-muted inline-block rounded-md px-1.5 py-0.5 align-baseline text-sm font-medium",
        element.children[0][KEYS.bold] === true && "font-bold",
        element.children[0][KEYS.italic] === true && "italic",
        element.children[0][KEYS.underline] === true && "underline",
      )}
      attributes={{
        ...props.attributes,
        "data-slate-value": element.value,
      }}
    >
      {props.children}
      {prefix}
      {element.value}
    </SlateElement>
  );
}
