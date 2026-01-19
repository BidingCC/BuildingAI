import { MessageContent as AIMessageContent } from "@buildingai/ui/components/ai-elements/message";
import {
  MessageAction as AIMessageAction,
  MessageActions as AIMessageActions,
  MessageToolbar as AIMessageToolbar,
} from "@buildingai/ui/components/ai-elements/message";
import { Button } from "@buildingai/ui/components/ui/button";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { CopyIcon, PencilIcon } from "lucide-react";
import { memo, useEffect, useState } from "react";

import { MessageBranch } from "./message-branch";

export interface UserMessageActionsProps {
  content: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSend?: (content: string) => void;
  onEditingChange?: (isEditing: boolean) => void;
  branchNumber?: number;
  branchCount?: number;
  branches?: string[];
  onSwitchBranch?: (messageId: string) => void;
  disabled?: boolean;
}

export const UserMessageActions = memo(function UserMessageActions({
  content,
  isEditing: externalIsEditing,
  onEdit,
  onCancel,
  onSend,
  onEditingChange,
  branchNumber = 1,
  branchCount = 1,
  branches = [],
  onSwitchBranch,
  disabled = false,
}: UserMessageActionsProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const isEditing = externalIsEditing ?? internalIsEditing;

  useEffect(() => {
    setEditContent(content);
  }, [content]);

  const handleEdit = () => {
    setEditContent(content);
    setInternalIsEditing(true);
    onEdit?.();
    onEditingChange?.(true);
  };

  const handleCancel = () => {
    setInternalIsEditing(false);
    setEditContent(content);
    onCancel?.();
    onEditingChange?.(false);
  };

  const handleSend = () => {
    if (editContent.trim() && editContent !== content) {
      onSend?.(editContent);
    }
    setInternalIsEditing(false);
    onEditingChange?.(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  if (isEditing) {
    return (
      <AIMessageContent className="w-full">
        <div className="w-full space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[80px] w-full resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              取消
            </Button>
            <Button size="sm" onClick={handleSend}>
              发送
            </Button>
          </div>
        </div>
      </AIMessageContent>
    );
  }

  return (
    <>
      <AIMessageContent>{content}</AIMessageContent>
      <AIMessageToolbar className="mt-2 flex min-w-0 justify-end">
        <AIMessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
          <AIMessageAction label="Edit" onClick={handleEdit} tooltip="编辑">
            <PencilIcon className="size-4" />
          </AIMessageAction>
          <AIMessageAction label="Copy" onClick={handleCopy} tooltip="复制">
            <CopyIcon className="size-4" />
          </AIMessageAction>
          <MessageBranch
            branchNumber={branchNumber}
            branchCount={branchCount}
            branches={branches}
            onSwitchBranch={onSwitchBranch}
            disabled={disabled}
          />
        </AIMessageActions>
      </AIMessageToolbar>
    </>
  );
});
