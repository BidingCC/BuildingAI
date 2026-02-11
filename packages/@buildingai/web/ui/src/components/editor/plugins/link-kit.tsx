"use client";

import { LinkPlugin } from "@platejs/link/react";

import { LinkElement } from "../ui/link-node";
import { LinkFloatingToolbar } from "../ui/link-toolbar";

export const LinkKit = [
  LinkPlugin.configure({
    render: {
      node: LinkElement,
      afterEditable: () => <LinkFloatingToolbar />,
    },
  }),
];
