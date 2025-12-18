import { type DependencyList, useEffect, useId, useRef } from "react";

export type HeadMeta = {
  key?: string;
  name?: string;
  property?: string;
  content?: string;
  charSet?: string;
  httpEquiv?: string;
} & Record<string, string | undefined>;

export type HeadLink = {
  key?: string;
  rel?: string;
  href?: string;
  type?: string;
  sizes?: string;
  media?: string;
  crossOrigin?: "anonymous" | "use-credentials" | "";
} & Record<string, string | undefined>;

export type HeadScript = {
  key?: string;
  src?: string;
  type?: string;
  async?: boolean;
  defer?: boolean;
  crossOrigin?: "anonymous" | "use-credentials" | "";
  children?: string;
} & Record<string, string | boolean | undefined>;

export type HeadInput = {
  title?: string;
  meta?: HeadMeta[];
  link?: HeadLink[];
  script?: HeadScript[];
};

const OWNER_ATTR = "data-use-head-owner";
const KEY_ATTR = "data-use-head-key";

const attributeAliases: Record<string, string> = {
  charSet: "charset",
  httpEquiv: "http-equiv",
};

type HeadState = {
  initialDocumentTitle: string | undefined;
  titleOwnerOrder: string[];
  titleByOwner: Map<string, string>;
};

const GLOBAL_KEY = "__USE_HEAD_STATE__";

function getHeadState(): HeadState {
  if (typeof window === "undefined") {
    return {
      initialDocumentTitle: undefined,
      titleOwnerOrder: [],
      titleByOwner: new Map(),
    };
  }

  const win = window as typeof window & { [GLOBAL_KEY]?: HeadState };
  if (!win[GLOBAL_KEY]) {
    win[GLOBAL_KEY] = {
      initialDocumentTitle: undefined,
      titleOwnerOrder: [],
      titleByOwner: new Map(),
    };
  }

  return win[GLOBAL_KEY];
}

function stableStringify(value: unknown): string {
  if (value === null) return "null";

  const t = typeof value;
  if (t === "string") return JSON.stringify(value);
  if (t === "number") return Number.isFinite(value as number) ? String(value) : "null";
  if (t === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (t === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((k) => record[k] !== undefined)
      .sort();

    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(",")}}`;
  }

  return JSON.stringify(String(value));
}

function applyDocumentTitle() {
  if (typeof document === "undefined") return;

  const state = getHeadState();

  if (state.initialDocumentTitle === undefined) {
    state.initialDocumentTitle = document.title;
  }

  for (let i = state.titleOwnerOrder.length - 1; i >= 0; i -= 1) {
    const owner = state.titleOwnerOrder[i];
    const value = state.titleByOwner.get(owner);
    if (value) {
      document.title = value;
      return;
    }
  }

  if (state.initialDocumentTitle !== undefined) {
    document.title = state.initialDocumentTitle;
  }
}

function ensureTitleOwner(owner: string) {
  const state = getHeadState();
  if (state.titleOwnerOrder.includes(owner)) return;
  state.titleOwnerOrder.push(owner);
}

function removeTitleOwner(owner: string) {
  const state = getHeadState();
  const index = state.titleOwnerOrder.indexOf(owner);
  if (index === -1) return;
  state.titleOwnerOrder.splice(index, 1);
}

function setTagAttributes(el: HTMLElement, attrs: Record<string, string | boolean | undefined>) {
  Object.entries(attrs).forEach(([rawKey, rawValue]) => {
    if (rawValue === undefined) return;

    const attrKey = attributeAliases[rawKey] ?? rawKey;

    if (typeof rawValue === "boolean") {
      if (rawValue) el.setAttribute(attrKey, "");
      else el.removeAttribute(attrKey);
      return;
    }

    el.setAttribute(attrKey, rawValue);
  });
}

function createHeadElement(
  tagName: "meta" | "link" | "script",
  owner: string,
  descriptor: Record<string, unknown>,
) {
  const el = document.createElement(tagName);
  el.setAttribute(OWNER_ATTR, owner);

  const { key, children, ...rest } = descriptor as Record<string, unknown> & {
    key?: string;
    children?: string;
  };

  if (key) el.setAttribute(KEY_ATTR, key);
  setTagAttributes(el, rest as Record<string, string | boolean | undefined>);

  if (tagName === "script" && typeof children === "string") {
    el.textContent = children;
  }

  return el;
}

export const useHead = (head: HeadInput, deps?: DependencyList) => {
  const reactId = useId();
  const ownerRef = useRef<string | null>(null);

  if (!ownerRef.current) {
    ownerRef.current = `use-head-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  }

  const owner = ownerRef.current!;

  useEffect(() => {
    if (typeof document === "undefined") return;
    ensureTitleOwner(owner);

    return () => {
      const state = getHeadState();
      state.titleByOwner.delete(owner);
      removeTitleOwner(owner);
      applyDocumentTitle();
    };
  }, [owner]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const state = getHeadState();
    if (head.title) state.titleByOwner.set(owner, head.title);
    else state.titleByOwner.delete(owner);

    applyDocumentTitle();
  }, [owner, head.title]);

  const prevSignatureRef = useRef<string>("");
  const tagsSignature = stableStringify({
    meta: head.meta ?? [],
    link: head.link ?? [],
    script: head.script ?? [],
  });

  const signatureChanged = prevSignatureRef.current !== tagsSignature;
  if (signatureChanged) {
    prevSignatureRef.current = tagsSignature;
  }

  useEffect(
    () => {
      if (typeof document === "undefined") return;

      const meta = head.meta ?? [];
      const link = head.link ?? [];
      const script = head.script ?? [];

      const managedElements: HTMLElement[] = [];

      const upsertElement = (
        tagName: "meta" | "link" | "script",
        item: Record<string, unknown>,
      ) => {
        const { key } = item as { key?: string };

        if (key) {
          const existing = document.head.querySelector(
            `${tagName}[${OWNER_ATTR}="${owner}"][${KEY_ATTR}="${key}"]`,
          ) as HTMLElement | null;

          if (existing) {
            const { children, ...rest } = item as { children?: string };
            setTagAttributes(existing, rest as Record<string, string | boolean | undefined>);
            if (tagName === "script" && typeof children === "string") {
              existing.textContent = children;
            }
            managedElements.push(existing);
            return;
          }
        }

        const el = createHeadElement(tagName, owner, item);
        document.head.appendChild(el);
        managedElements.push(el);
      };

      meta.forEach((item) => upsertElement("meta", item));
      link.forEach((item) => upsertElement("link", item));
      script.forEach((item) => upsertElement("script", item));

      const ownedElements = document.head.querySelectorAll(`[${OWNER_ATTR}="${owner}"]`);
      ownedElements.forEach((el) => {
        if (!managedElements.includes(el as HTMLElement)) {
          el.parentNode?.removeChild(el);
        }
      });

      return () => {
        managedElements.forEach((el) => {
          el.parentNode?.removeChild(el);
        });
      };
    },
    deps ?? [owner, tagsSignature],
  );
};

export default useHead;
