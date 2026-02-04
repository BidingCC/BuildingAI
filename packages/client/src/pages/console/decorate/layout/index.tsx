import { PageContainer } from "@/layouts/console/_components/page-container";

import { DecorateLayoutSidebar } from "./_components/decorate-layout-sidebar";

const DecorateLayoutIndexPage = () => {
  return (
    <PageContainer className="h-inset relative">
      <div className="h-full overflow-hidden rounded-lg border pl-64">
        <DecorateLayoutSidebar />
        <div className="flex h-full flex-col gap-4 p-4 max-sm:hidden">
          <div className="grid auto-rows-min gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 hidden aspect-video rounded-xl sm:block" />
            <div className="bg-muted/50 hidden aspect-video rounded-xl xl:block" />
          </div>
          <div className="bg-muted/50 flex-1 rounded-xl" />
        </div>
      </div>
    </PageContainer>
  );
};

export default DecorateLayoutIndexPage;
