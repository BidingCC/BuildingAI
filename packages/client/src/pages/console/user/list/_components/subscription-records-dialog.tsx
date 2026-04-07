import { useI18n } from "@buildingai/i18n";
import { useUserSubscriptionsQuery } from "@buildingai/services/console";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { cn } from "@buildingai/ui/lib/utils";
import { useState } from "react";

type SubscriptionRecordsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string;
};

/**
 * Get refund status badge
 */
function RefundStatusBadge({ status, t }: { status: number; t: (key: string) => string }) {
  if (status === 1) {
    return (
      <Badge variant="destructive" className="gap-1">
        {t("user.dialog.subscriptionRecords.refunded")}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      {t("user.dialog.subscriptionRecords.notRefunded")}
    </Badge>
  );
}

export function SubscriptionRecordsDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: SubscriptionRecordsDialogProps) {
  const { t } = useI18n();
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const { data, isLoading } = useUserSubscriptionsQuery(
    userId,
    { page, pageSize },
    { enabled: open },
  );

  const records = data?.items ?? [];
  const total = data?.total ?? 0;

  const { PaginationComponent } = usePagination({
    total,
    pageSize,
    page,
    onPageChange: setPage,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl! flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("user.dialog.subscriptionRecords.title")}
            {userName && <span className="text-muted-foreground text-sm">- {userName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="-mx-6 flex-1 overflow-auto px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">
                {t("user.dialog.subscriptionRecords.loading")}
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
              <p>{t("user.dialog.subscriptionRecords.noRecords")}</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("user.dialog.subscriptionRecords.level")}</TableHead>
                    <TableHead>{t("user.dialog.subscriptionRecords.duration")}</TableHead>
                    <TableHead>{t("user.dialog.subscriptionRecords.validPeriod")}</TableHead>
                    <TableHead>{t("user.dialog.subscriptionRecords.source")}</TableHead>
                    <TableHead>{t("user.dialog.subscriptionRecords.createdAt")}</TableHead>
                    <TableHead>{t("user.dialog.subscriptionRecords.refundStatus")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {record.level ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8">
                              <AvatarImage src={record.level.icon} alt={record.level.name} />
                              <AvatarFallback>{record.level.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{record.level.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span>{record.duration}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(!record.endTime && "text-muted-foreground")}>
                            <TimeText value={record.endTime} format="YYYY/MM/DD" />
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{record.sourceDesc}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          <TimeText value={record.createdAt} format="YYYY/MM/DD HH:mm:ss" />
                        </span>
                      </TableCell>
                      <TableCell>
                        <RefundStatusBadge status={record.refundStatus} t={t} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {!isLoading && records.length > 0 && <PaginationComponent />}
      </DialogContent>
    </Dialog>
  );
}
