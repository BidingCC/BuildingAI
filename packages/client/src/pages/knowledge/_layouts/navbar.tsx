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

import { KnowledgeSidebarMain } from "./sidebar";

export function KnowledgeNavbar() {
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
            <SheetTitle>knowledge sidebar</SheetTitle>
            <SheetDescription>knowledge</SheetDescription>
          </SheetHeader>

          <KnowledgeSidebarMain className="flex!" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
