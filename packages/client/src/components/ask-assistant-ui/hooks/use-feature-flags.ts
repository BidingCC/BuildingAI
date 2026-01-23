import { useCallback, useState } from "react";

export interface FeatureFlags {
  thinking?: boolean;
  generateImage?: boolean;
  search?: boolean;
  [key: string]: boolean | undefined;
}

export function useFeatureFlags(initialEnableThinking?: boolean) {
  const [feature, setFeature] = useState<FeatureFlags>(() => ({
    thinking: initialEnableThinking ?? false,
    generateImage: false,
    search: false,
  }));

  const setFeatureFlag = useCallback((key: string, value: boolean) => {
    setFeature((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    feature,
    setFeatureFlag,
  };
}
