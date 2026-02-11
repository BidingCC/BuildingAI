import type { DatasetsDocument } from "@buildingai/services/web";
import { useCallback, useMemo, useState } from "react";

export type DialogState =
  | { type: "upload" }
  | { type: "member" }
  | { type: "publish" }
  | { type: "editDataset" }
  | {
      type: "editTags";
      mode: "single" | "batch";
      document?: DatasetsDocument;
      documentIds: string[];
    }
  | { type: "transfer"; mode: "move" | "copy"; documentIds: string[] }
  | null;

export interface DialogManager {
  current: DialogState;
  open: (state: NonNullable<DialogState>) => void;
  close: () => void;
}

export function useDialogManager(): DialogManager {
  const [current, setCurrent] = useState<DialogState>(null);

  const open = useCallback((state: NonNullable<DialogState>) => {
    setCurrent(state);
  }, []);

  const close = useCallback(() => {
    setCurrent(null);
  }, []);

  return useMemo(() => ({ current, open, close }), [current, open, close]);
}
