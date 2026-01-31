import { Palette, StickyNote } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FunctionComponent } from "react";

import type { BlockNodeProps } from "../base/block.base";
import { useWorkflowStore } from "../../store/store";
import type { NoteBlockData, NoteColor } from "./note.types";
import { COLOR_OPTIONS, COLOR_STYLES } from "./note.types";

/**
 * Note Node 组件
 * 特殊节点：支持直接在节点上编辑内容，无需 Panel
 */
export const NoteNodeComponent: FunctionComponent<BlockNodeProps<NoteBlockData>> = ({
  id,
  data,
}) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(data.content);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 同步外部数据变化
  useEffect(() => {
    setContent(data.content);
  }, [data.content]);

  // 编辑模式自动聚焦
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    // 保存内容
    if (content !== data.content) {
      updateNodeData(id, { content });
    }
  }, [content, data.content, id, updateNodeData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl/Cmd + Enter 保存并退出
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        setIsEditing(false);
        if (content !== data.content) {
          updateNodeData(id, { content });
        }
      }
      // Esc 取消编辑
      if (e.key === "Escape") {
        e.preventDefault();
        setContent(data.content);
        setIsEditing(false);
      }
    },
    [content, data.content, id, updateNodeData],
  );

  const handleColorChange = useCallback(
    (color: NoteColor) => {
      updateNodeData(id, { color });
      setShowColorPicker(false);
    },
    [id, updateNodeData],
  );

  return (
    <div
      className={`max-w-64 min-w-48 rounded-lg border-2 p-4 shadow-md transition-shadow hover:shadow-lg ${COLOR_STYLES[data.color]}`}
      onDoubleClick={handleDoubleClick}
    >
      {/* 头部 */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          <span className="text-sm font-semibold">笔记</span>
        </div>
        
        {/* 颜色选择器 */}
        <div className="relative">
          <button
            className="rounded p-1 transition-colors hover:bg-black/5"
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            title="更改颜色"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>

          {showColorPicker && (
            <div className="absolute right-0 top-full z-10 mt-1 rounded-lg border bg-white p-2 shadow-lg">
              <div className="flex gap-1">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`h-6 w-6 rounded ${option.bg} border-2 ${
                      data.color === option.value
                        ? "border-gray-800"
                        : "border-gray-300"
                    } transition-transform hover:scale-110`}
                    onClick={() => handleColorChange(option.value)}
                    title={option.label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="min-h-[100px] w-full resize-none rounded border border-gray-400 bg-transparent p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="输入笔记内容... (Ctrl+Enter 保存，Esc 取消)"
        />
      ) : (
        <div className="min-h-[100px] cursor-text whitespace-pre-wrap text-sm">
          {data.content || (
            <span className="text-gray-500">双击编辑笔记...</span>
          )}
        </div>
      )}
    </div>
  );
};
