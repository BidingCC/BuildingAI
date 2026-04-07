import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { cn } from "@buildingai/ui/lib/utils";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

type StarterQuestion = {
  id: string;
  text: string;
};

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const SortableStarterQuestionItem = memo(
  ({
    item,
    canDelete,
    onChange,
    onDelete,
  }: {
    item: StarterQuestion;
    canDelete: boolean;
    onChange: (id: string, text: string) => void;
    onDelete: (id: string) => void;
  }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: item.id,
    });

    const style = useMemo(
      () => ({
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }),
      [transform, transition, isDragging],
    );

    return (
      <div ref={setNodeRef} style={style}>
        <div className="bg-background flex items-center rounded-md pr-2">
          <div className="relative w-full">
            <span
              {...attributes}
              {...listeners}
              className="absolute top-1/2 left-2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
            >
              <GripVertical className="text-muted-foreground h-4 w-4" />
            </span>
            <Input
              value={item.text}
              placeholder={t("agent.detail.interface.inputPlaceholder")}
              className={cn(
                "border-0 pr-9 pl-8 shadow-none focus-visible:ring-0",
                !canDelete && "pr-3",
              )}
              onChange={(e) => onChange(item.id, e.target.value)}
            />
            {canDelete && (
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive absolute top-1/2 right-2 -translate-y-1/2"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

SortableStarterQuestionItem.displayName = "SortableStarterQuestionItem";

export const StarterQuestions = memo(
  ({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) => {
    const { t } = useI18n();
    const sensors = useSensors(useSensor(PointerSensor));

    const [starterQuestions, setStarterQuestions] = useState<StarterQuestion[]>(() => {
      if (Array.isArray(value) && value.length > 0) {
        return value.map((text) => ({ id: createId(), text }));
      }
      return [];
    });

    const handleStarterQuestionDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setStarterQuestions((prev) => {
          const oldIndex = prev.findIndex((x) => x.id === active.id);
          const newIndex = prev.findIndex((x) => x.id === over.id);
          if (oldIndex < 0 || newIndex < 0) return prev;
          const updated = arrayMove(prev, oldIndex, newIndex);
          onChange(updated.map((q) => q.text));
          return updated;
        });
      },
      [onChange],
    );

    const handleChange = useCallback(
      (id: string, text: string) => {
        setStarterQuestions((prev) => {
          const updated = prev.map((it) => (it.id === id ? { ...it, text } : it));
          onChange(updated.map((q) => q.text));
          return updated;
        });
      },
      [onChange],
    );

    const handleDelete = useCallback(
      (id: string) => {
        setStarterQuestions((prev) => {
          const updated = prev.filter((it) => it.id !== id);
          onChange(updated.map((q) => q.text));
          return updated;
        });
      },
      [onChange],
    );

    const handleAdd = useCallback(() => {
      setStarterQuestions((prev) => {
        const updated = [...prev, { id: createId(), text: "" }];
        onChange(updated.map((q) => q.text));
        return updated;
      });
    }, [onChange]);

    return (
      <div className="bg-secondary rounded-lg px-3 py-2.5">
        <div
          className={cn(
            "flex items-center justify-between",
            starterQuestions.length !== 0 && "mb-2",
          )}
        >
          <h3 className="text-sm font-medium">{t("agent.detail.interface.starterQuestions")}</h3>

          <Button
            variant="ghost"
            size="xs"
            className="hover:bg-primary/10 hover:text-primary"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            <span>{t("common.add")}</span>
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleStarterQuestionDragEnd}
          >
            <SortableContext
              items={starterQuestions.map((x) => x.id)}
              strategy={verticalListSortingStrategy}
            >
              {starterQuestions.map((q) => (
                <SortableStarterQuestionItem
                  key={q.id}
                  item={q}
                  canDelete={starterQuestions.length > 0}
                  onChange={handleChange}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    );
  },
);

StarterQuestions.displayName = "StarterQuestions";
