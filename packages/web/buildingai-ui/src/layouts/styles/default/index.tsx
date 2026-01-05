// import { DefaultStyleLogo } from "./default-logo";

// const DefaultLayout = () => {
//   return (
//     <div className="flex h-dvh">
//       <div className="bg-sidebar h-full w-72">
//         <div>
//           <DefaultStyleLogo />
//         </div>
//       </div>
//       <Outlet />
//     </div>
//   );
// };

// export default DefaultLayout;

import { Outlet } from "react-router-dom";
import { DefaultAppSidebar } from "./_components/default-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@buildingai/ui/components/ui/breadcrumb";
import { Separator } from "@buildingai/ui/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@buildingai/ui/components/ui/sidebar";

export default function Page() {
  return (
    <SidebarProvider>
      <DefaultAppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
