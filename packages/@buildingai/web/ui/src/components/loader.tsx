import { cn } from "../lib/utils";

interface LoaderProps {
  color?: string;
  speed?: number;
  className?: string;
}

export const Loader = ({ color = "var(--primary)", speed = 0.8, className }: LoaderProps) => {
  return (
    <div
      className={cn("three-body relative inline-block size-10", className)}
      style={{ "--uib-color": color, "--uib-speed": `${speed}s` } as React.CSSProperties}
    >
      <div className="three-body__dot absolute h-full w-[30%]" />
      <div className="three-body__dot absolute h-full w-[30%]" />
      <div className="three-body__dot absolute h-full w-[30%]" />
    </div>
  );
};
