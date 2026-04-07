import { useI18n } from "@buildingai/i18n";
import {
  Editor,
  EditorContainer,
  EditorKit,
  markdownToValue,
  Plate,
  serializeEditorToMarkdown,
  usePlateEditor,
} from "@buildingai/ui/components/editor";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { cn } from "@buildingai/ui/lib/utils";
import { HelpCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

type QuickCommand = {
  id: string;
  name: string;
  prompt: string;
  replyMode: "custom" | "model";
  replyContent?: string;
};

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function parseEditorValue(raw: unknown): any[] {
  if (Array.isArray(raw) && raw.length > 0) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* fall through to markdown */
    }
    return markdownToValue(raw) as any[];
  }
  return markdownToValue("") as any[];
}

export const QuickCommands = memo(
  ({
    value,
    onChange,
  }: {
    value: {
      avatar?: string;
      name: string;
      content: string;
      replyType: "custom" | "model";
      replyContent?: string;
    }[];
    onChange: (
      value: {
        avatar?: string;
        name: string;
        content: string;
        replyType: "custom" | "model";
        replyContent?: string;
      }[],
    ) => void;
  }) => {
    const { t } = useI18n();
    const { confirm } = useAlertDialog();

    const [quickCommands, setQuickCommands] = useState<QuickCommand[]>(() => {
      if (Array.isArray(value) && value.length > 0) {
        return value.map((cmd) => ({
          id: createId(),
          name: cmd.name,
          prompt: cmd.content,
          replyMode: cmd.replyType,
          replyContent: cmd.replyContent,
        }));
      }
      return [];
    });

    const [quickCommandDialogOpen, setQuickCommandDialogOpen] = useState(false);
    const [editingQuickCommandId, setEditingQuickCommandId] = useState<string | null>(null);
    const [quickCommandDraft, setQuickCommandDraft] = useState<QuickCommand | null>(null);

    const quickCommandEditorInitialValue = useMemo(
      () => parseEditorValue(quickCommandDraft?.replyContent),
      [quickCommandDraft?.replyContent],
    );

    const quickCommandEditor = usePlateEditor({
      plugins: EditorKit,
      id: `agent-quick-command-reply-${quickCommandDraft?.id ?? "empty"}`,
      value: quickCommandEditorInitialValue,
    });

    const openCreateQuickCommand = useCallback(() => {
      const draft: QuickCommand = {
        id: createId(),
        name: "",
        prompt: "",
        replyMode: "custom",
        replyContent: "",
      };
      setEditingQuickCommandId(null);
      setQuickCommandDraft(draft);
      setQuickCommandDialogOpen(true);
    }, []);

    const openEditQuickCommand = useCallback((cmd: QuickCommand) => {
      setEditingQuickCommandId(cmd.id);
      setQuickCommandDraft({ ...cmd });
      setQuickCommandDialogOpen(true);
    }, []);

    const submitQuickCommand = useCallback(() => {
      if (!quickCommandDraft) return;
      const name = quickCommandDraft.name.trim();
      const prompt = quickCommandDraft.prompt.trim();
      if (!name || !prompt) return;

      const updated = !editingQuickCommandId
        ? [...quickCommands, quickCommandDraft]
        : quickCommands.map((it) => (it.id === editingQuickCommandId ? quickCommandDraft : it));
      setQuickCommands(updated);
      onChange(
        updated.map((cmd) => ({
          avatar: "",
          name: cmd.name,
          content: cmd.prompt,
          replyType: cmd.replyMode,
          replyContent: cmd.replyContent ?? "",
        })),
      );
      setQuickCommandDialogOpen(false);
    }, [quickCommandDraft, editingQuickCommandId, quickCommands, onChange]);

    const deleteQuickCommand = useCallback(
      async (cmd: QuickCommand) => {
        try {
          await confirm({
            title: t("agent.detail.interface.deleteQuickCommand"),
            description: t("agent.detail.interface.confirmDeleteQuickCommand"),
            confirmText: t("common.delete"),
            confirmVariant: "destructive",
          });
        } catch {
          return;
        }
        const updated = quickCommands.filter((x) => x.id !== cmd.id);
        setQuickCommands(updated);
        onChange(
          updated.map((c) => ({
            avatar: "",
            name: c.name,
            content: c.prompt,
            replyType: c.replyMode,
            replyContent: c.replyContent ?? "",
          })),
        );
      },
      [confirm, quickCommands, onChange],
    );

    return (
      <div className="bg-secondary rounded-lg px-3 py-2.5">
        <div
          className={cn("flex items-center justify-between", quickCommands.length !== 0 && "mb-2")}
        >
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-medium">{t("agent.detail.interface.quickCommands")}</h3>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="text-muted-foreground h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-background text-xs">
                  {t("agent.detail.interface.quickCommandsDesc")}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Button
            variant="ghost"
            size="xs"
            className="hover:bg-primary/10 hover:text-primary"
            onClick={openCreateQuickCommand}
          >
            <Plus className="h-4 w-4" />
            <span>{t("common.add")}</span>
          </Button>
        </div>

        <div className="space-y-2">
          {quickCommands.map((cmd) => (
            <div
              key={cmd.id}
              className="group/quick-command bg-background flex items-center gap-2 rounded-md py-2 pr-1.5 pl-3"
            >
              <div className="min-w-0 flex-1 truncate text-sm font-medium">{cmd.name}</div>
              <div className="relative flex items-center">
                <Badge
                  variant="outline"
                  className="opacity-100 transition-opacity group-hover/quick-command:opacity-0"
                >
                  {cmd.replyMode === "custom"
                    ? t("agent.detail.interface.customReply")
                    : t("agent.detail.interface.modelReply")}
                </Badge>
                <div className="absolute right-0 flex items-center opacity-0 transition-opacity group-hover/quick-command:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditQuickCommand(cmd)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                    onClick={() => deleteQuickCommand(cmd)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Dialog
          open={quickCommandDialogOpen}
          onOpenChange={(open) => {
            setQuickCommandDialogOpen(open);
            if (!open) {
              setEditingQuickCommandId(null);
              setQuickCommandDraft(null);
            }
          }}
        >
          <DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="shrink-0 px-4 pt-4">
              <DialogTitle>
                {editingQuickCommandId
                  ? t("agent.detail.interface.editQuickCommand")
                  : t("agent.detail.interface.addQuickCommand")}
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">
                    {t("agent.detail.interface.instructionName")}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={quickCommandDraft?.name ?? ""}
                    placeholder={t("agent.detail.interface.inputInstructionName")}
                    onChange={(e) =>
                      setQuickCommandDraft((prev) =>
                        prev ? { ...prev, name: e.target.value } : prev,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    {t("agent.detail.interface.sendInstructionContent")}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={quickCommandDraft?.prompt ?? ""}
                    placeholder={t("agent.detail.interface.inputInstructionContent")}
                    className="bg-background resize-none"
                    rows={4}
                    onChange={(e) =>
                      setQuickCommandDraft((prev) =>
                        prev ? { ...prev, prompt: e.target.value } : prev,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    {t("agent.detail.interface.replyMethod")}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant={quickCommandDraft?.replyMode === "custom" ? "default" : "outline"}
                      onClick={() =>
                        setQuickCommandDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                replyMode: "custom",
                                replyContent: prev.replyContent ?? "",
                              }
                            : prev,
                        )
                      }
                    >
                      {t("agent.detail.interface.customReply")}
                    </Button>
                    <Button
                      type="button"
                      variant={quickCommandDraft?.replyMode === "model" ? "default" : "outline"}
                      onClick={() =>
                        setQuickCommandDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                replyMode: "model",
                                replyContent: undefined,
                              }
                            : prev,
                        )
                      }
                    >
                      {t("agent.detail.interface.modelReply")}
                    </Button>
                  </div>
                </div>

                {quickCommandDraft?.replyMode === "custom" && (
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {t("agent.detail.interface.replyContent")}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Plate
                      key={quickCommandDraft?.id ?? "empty"}
                      editor={quickCommandEditor}
                      onValueChange={() => {
                        setQuickCommandDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                replyContent: serializeEditorToMarkdown(quickCommandEditor),
                              }
                            : prev,
                        );
                      }}
                    >
                      <EditorContainer className="max-w-full overflow-x-auto rounded-lg border">
                        <Editor variant="default" className="pb-30!" />
                      </EditorContainer>
                    </Plate>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="shrink-0 px-4 py-4">
              <DialogClose asChild>
                <Button variant="outline">{t("common.cancel")}</Button>
              </DialogClose>
              <Button
                onClick={submitQuickCommand}
                disabled={
                  !quickCommandDraft?.name.trim() ||
                  !quickCommandDraft?.prompt.trim() ||
                  (quickCommandDraft?.replyMode === "custom" && !quickCommandDraft?.replyContent)
                }
              >
                {t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  },
);

QuickCommands.displayName = "QuickCommands";
