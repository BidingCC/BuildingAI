import { Badge } from "@buildingai/ui/components/ui/badge";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import { cn } from "@buildingai/ui/lib/utils";
import { FileText } from "lucide-react";
import type { ReactNode } from "react";

export interface DocumentItem {
  id: string;
  title: string;
  summary?: string;
  fileType: string;
  fileSize: string;
  tags?: string[];
  thumbnail?: string;
  number?: string;
}

export interface DocumentListProps {
  documents?: DocumentItem[];
  uploadSlot?: ReactNode;
  onDocumentClick?: (document: DocumentItem) => void;
  searchExpanded?: boolean;
  searchResultCount?: number;
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes("Word") || fileType.includes("word")) {
    return <FileText className="size-4 text-blue-600" />;
  }
  if (fileType.includes("PDF") || fileType.includes("pdf")) {
    return <FileText className="size-4 text-red-600" />;
  }
  return <FileText className="size-4 text-gray-500" />;
};

const DocumentCard = ({
  document,
  onClick,
}: {
  document: DocumentItem;
  onClick?: (document: DocumentItem) => void;
}) => {
  return (
    <Card
      className={cn(
        "bg-sidebar cursor-pointer rounded-lg border-0 shadow-none ring-0 transition-colors",
      )}
      onClick={() => onClick?.(document)}
      size="sm"
    >
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              {document.number && (
                <div className="text-muted-foreground mb-1 text-xs">{document.number}</div>
              )}
              <div className="mb-2 line-clamp-2 text-sm font-semibold">{document.title}</div>
              {document.summary && (
                <div className="text-muted-foreground line-clamp-2 text-xs">
                  <span className="font-medium">AI生成摘要:</span> {document.summary}
                </div>
              )}
            </div>

            <div className="shrink-0">
              <div className="bg-muted size-16 overflow-hidden rounded-lg">
                {document.thumbnail && document.thumbnail.startsWith("http") ? (
                  <img
                    src={document.thumbnail}
                    alt={document.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    {getFileIcon(document.fileType)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {getFileIcon(document.fileType)}
              <span className="text-muted-foreground text-xs">
                {document.fileType} {document.fileSize}
              </span>
            </div>

            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {document.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="px-2 py-0 text-xs">
                    ◇{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function DocumentList({ documents = [], uploadSlot, onDocumentClick }: DocumentListProps) {
  return (
    <div className="space-y-4">
      {/* Upload Slot */}
      {uploadSlot !== undefined && <div>{uploadSlot || null}</div>}

      {/* Document List */}
      <div className="space-y-3">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} onClick={onDocumentClick} />
        ))}
        {documents.length === 0 && (
          <div className="text-muted-foreground py-8 text-center text-sm">暂无内容</div>
        )}
      </div>
    </div>
  );
}
