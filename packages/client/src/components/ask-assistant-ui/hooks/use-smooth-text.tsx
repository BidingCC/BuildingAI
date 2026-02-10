"use client";

import { useEffect, useMemo, useRef, useState } from "react";

class TextStreamAnimator {
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = Date.now();

  public targetText: string = "";

  constructor(
    public currentText: string,
    private setText: (newText: string) => void,
  ) {}

  start() {
    if (this.animationFrameId !== null) return;
    this.lastUpdateTime = Date.now();
    this.animate();
  }

  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = () => {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    let timeToConsume = deltaTime;

    const remainingChars = this.targetText.length - this.currentText.length;
    if (remainingChars <= 0) {
      this.animationFrameId = null;
      return;
    }

    const baseTimePerChar = Math.min(5, 250 / remainingChars);

    let charsToAdd = 0;
    while (timeToConsume >= baseTimePerChar && charsToAdd < remainingChars) {
      charsToAdd++;
      timeToConsume -= baseTimePerChar;
    }

    if (charsToAdd !== remainingChars) {
      this.animationFrameId = requestAnimationFrame(this.animate);
    } else {
      this.animationFrameId = null;
    }
    if (charsToAdd === 0) return;

    this.currentText = this.targetText.slice(0, this.currentText.length + charsToAdd);
    this.lastUpdateTime = currentTime - timeToConsume;
    this.setText(this.currentText);
  };
}

export interface UseSmoothTextOptions {
  /** Whether to enable smooth animation */
  smooth?: boolean;
  /** Unique ID to track text changes (e.g., message ID) */
  id?: string;
}

export interface UseSmoothTextReturn {
  /** The displayed text (animated if smooth is enabled) */
  text: string;
  /** Whether the text is still animating */
  isAnimating: boolean;
}

/**
 * Hook for smooth text streaming animation
 *
 * @param targetText - The target text to animate towards
 * @param options - Configuration options
 * @returns The displayed text and animation state
 */
export function useSmoothText(
  targetText: string,
  options: UseSmoothTextOptions = {},
): UseSmoothTextReturn {
  const { smooth = true, id } = options;
  const idRef = useRef(id);
  const [displayedText, setDisplayedText] = useState(targetText);
  const [isAnimating, setIsAnimating] = useState(false);

  const animatorRef = useRef<TextStreamAnimator | null>(null);

  // Initialize animator
  useEffect(() => {
    if (!animatorRef.current) {
      animatorRef.current = new TextStreamAnimator(targetText, (text) => {
        setDisplayedText(text);
        setIsAnimating(text !== targetText);
      });
    }
  }, []);

  useEffect(() => {
    if (!smooth || !animatorRef.current) {
      animatorRef.current?.stop();
      setDisplayedText(targetText);
      setIsAnimating(false);
      return;
    }

    // Reset if ID changed or text doesn't start with current target
    if (idRef.current !== id || !targetText.startsWith(animatorRef.current.targetText)) {
      idRef.current = id;
      setDisplayedText(targetText);
      setIsAnimating(false);

      animatorRef.current.currentText = targetText;
      animatorRef.current.targetText = targetText;
      animatorRef.current.stop();

      return;
    }

    // Update target and start animation
    animatorRef.current.targetText = targetText;
    setIsAnimating(animatorRef.current.currentText !== targetText);
    animatorRef.current.start();
  }, [targetText, smooth, id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      animatorRef.current?.stop();
    };
  }, []);

  return useMemo(
    () => ({
      text: smooth ? displayedText : targetText,
      isAnimating: smooth ? isAnimating : false,
    }),
    [smooth, displayedText, targetText, isAnimating],
  );
}
