import { useConfigStore } from "@buildingai/stores";
import { cn } from "@buildingai/ui/lib/utils";

import SvgIcons from "./svg-icons";

const AppLogo = ({
  showAppName = true,
  desc,
  className,
}: {
  showAppName?: boolean;
  desc?: React.ReactNode | string;
  className?: string;
}) => {
  const { websiteConfig } = useConfigStore((state) => state.config);

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <>
        {websiteConfig?.webinfo.logo ? (
          <img
            className="h-10 shrink-0"
            src={websiteConfig?.webinfo.logo}
            alt={websiteConfig?.webinfo.name}
          />
        ) : (
          <SvgIcons.buildingaiFull className="h-10 shrink-0" />
        )}
      </>
      {showAppName && (
        <div className="flex flex-col justify-center gap-1">
          <span className="line-clamp-1 text-lg leading-none font-bold">
            {websiteConfig?.webinfo.name}
          </span>
          {desc && typeof desc === "string" ? (
            <span className="text-muted-foreground text-xs">{desc}</span>
          ) : (
            desc
          )}
        </div>
      )}
    </div>
  );
};

export default AppLogo;
