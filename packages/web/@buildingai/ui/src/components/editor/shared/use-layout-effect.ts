import { useEffect, useLayoutEffect } from "react"

import { CAN_USE_DOM } from "@buildingai/ui/components/editor/shared/can-use-dom"

// This workaround is no longer necessary in React 19,
// but we currently support React >=17.x
// https://github.com/facebook/react/pull/26395
const useLayoutEffectImpl: typeof useLayoutEffect = CAN_USE_DOM
  ? useLayoutEffect
  : useEffect

export default useLayoutEffectImpl
