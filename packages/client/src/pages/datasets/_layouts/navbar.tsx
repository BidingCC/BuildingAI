import { Button } from "@buildingai/ui/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@buildingai/ui/components/ui/sheet";
import { SidebarTrigger } from "@buildingai/ui/components/ui/sidebar";
import { Menu } from "lucide-react";

import { DatasetsSidebarMain } from "./sidebar";

export function DatasetsNavbar() {
  return (
    <div className="bg-background sticky top-0 z-1 flex h-13 shrink-0 items-center justify-between px-2 sm:px-4">
      <div>
        <SidebarTrigger className="md:hidden" />
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="md:hidden">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent showCloseButton={false} className="max-w-fit" aria-describedby={undefined}>
          <SheetHeader className="sr-only">
            <SheetTitle>datasets sidebar</SheetTitle>
            <SheetDescription>datasets</SheetDescription>
          </SheetHeader>

          <DatasetsSidebarMain className="flex!" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
