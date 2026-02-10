import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import { cn } from "@buildingai/ui/lib/utils";
import { Info } from "lucide-react";

const DataCard = ({
  children,
  title,
  className,
  action,
  description,
  contentClassName,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  contentClassName?: string;
  className?: string;
  action?: React.ReactNode;
}) => {
  return (
    <Card className={cn("gap-0 py-4", className)}>
      <CardHeader className="flex justify-between px-4">
        <div className="flex flex-1 shrink-0 flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription className="flex items-center gap-1 text-xs">
            <Info className="size-3" />
            <span className="leading-none">{description}</span>
          </CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn("mt-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
};

export default DataCard;
