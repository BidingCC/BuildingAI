"use client";

import { IndentKit } from "@buildingai/ui/components/editor/plugins/indent-kit";
import { TogglePlugin } from "@platejs/toggle/react";

import { ToggleElement } from "../ui/toggle-node";

export const ToggleKit = [...IndentKit, TogglePlugin.withComponent(ToggleElement)];
