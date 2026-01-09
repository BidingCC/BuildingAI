import { memo } from "react";

export const StreamingIndicator = memo(function StreamingIndicator() {
  return (
    <div className="flex items-center p-2">
      <div
        className="bg-foreground size-2 rounded-full"
        style={{
          animation: "streaming-pulse 1.2s ease-in-out infinite",
          transformOrigin: "center",
        }}
      />
      <style>{`
        @keyframes streaming-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.6);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
});
