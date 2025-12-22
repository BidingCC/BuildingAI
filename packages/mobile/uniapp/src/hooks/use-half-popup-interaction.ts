/**
 * @fileoverview Half-popup interaction composable hook
 * @description Provides smooth page transform interaction when half-popup opens/closes
 * @author BuildingAI Teams
 */

import { computed, type ComputedRef, type Ref, ref } from "vue";

/**
 * Configuration options for half-popup interaction
 * @description Options for customizing the transform behavior
 */
export interface UseHalfPopupInteractionOptions {
    /** Scale factor when popup is open (default: 0.92) */
    scale?: number;
    /** Maximum border radius in pixels (default: 24) */
    maxBorderRadius?: number;
    /** Maximum translate Y in pixels (default: 40) */
    maxTranslateY?: number;
}

/**
 * Return type for useHalfPopupInteraction hook
 * @description Return values from the hook
 */
export interface UseHalfPopupInteractionReturn {
    /** Current slide progress (0-1) */
    slideProgress: Ref<number>;
    /** Whether popup is open */
    isPopupOpen: Ref<boolean>;
    /** Handle slide progress event */
    handleSlideProgress: (progress: number) => void;
    /** Handle popup open event */
    handlePopupOpen: () => void;
    /** Handle popup close event */
    handlePopupClose: () => void;
    /** Computed page transform style */
    pageTransform: ComputedRef<{
        transform: string;
        transformOrigin: string;
        borderRadius: string;
        overflow: string;
        transition: string;
    }>;
}

/**
 * Half-popup interaction composable hook
 * @description Provides smooth page transform interaction when half-popup opens/closes
 * Similar to iOS modal presentation style with scale and rounded corners
 * @param options - Configuration options for the interaction
 * @returns Interaction state and computed styles
 * @example
 * ```typescript
 * const {
 *   slideProgress,
 *   isPopupOpen,
 *   handleSlideProgress,
 *   handlePopupOpen,
 *   handlePopupClose,
 *   pageTransform
 * } = useHalfPopupInteraction();
 *
 * // Use in template
 * <view :style="pageTransform">
 *   <!-- Your content -->
 * </view>
 *
 * <HalfPopup
 *   @slide-progress="handleSlideProgress"
 *   @open="handlePopupOpen"
 *   @close="handlePopupClose"
 * />
 * ```
 */
export function useHalfPopupInteraction(
    options: UseHalfPopupInteractionOptions = {},
): UseHalfPopupInteractionReturn {
    const { scale = 0.92, maxBorderRadius = 24, maxTranslateY = 40 } = options;

    const slideProgress = ref(0);
    const isPopupOpen = ref(false);

    /**
     * Handle slide progress from half-popup
     * @param progress - Slide progress (0-1)
     */
    const handleSlideProgress = (progress: number) => {
        slideProgress.value = progress;
    };

    /**
     * Handle popup open event
     */
    const handlePopupOpen = () => {
        isPopupOpen.value = true;
        slideProgress.value = 1;
    };

    /**
     * Handle popup close event
     */
    const handlePopupClose = () => {
        isPopupOpen.value = false;
        slideProgress.value = 0;
    };

    /**
     * Calculate page transform style based on slide progress
     * @description Creates transform style for smooth popup interaction
     * - Scales down the page when popup opens
     * - Adds rounded corners based on progress
     * - Translates down slightly for depth effect
     */
    const pageTransform = computed(() => {
        if (!isPopupOpen.value && slideProgress.value === 0) {
            return {
                transform: "none",
                transformOrigin: "center center",
                borderRadius: "0px",
                overflow: "hidden",
                transition: "transform 0.2s ease-out",
            };
        }

        // 直接使用进度值，不使用缓动函数，确保实时跟随
        // 进度为1时scale为指定值（缩小），进度为0时scale为1（正常）
        const finalScale = 1 - (1 - scale) * slideProgress.value;
        // 圆角根据进度动态变化，进度为1时圆角最大
        const borderRadius = maxBorderRadius * slideProgress.value;
        // 向下移动距离，进度为1时移动最大
        const translateY = maxTranslateY * slideProgress.value;

        // 只要进度不在边界值（0或1），就禁用transition实现实时跟随
        // 使用更小的阈值，确保从一开始滑动就能实时跟随
        const isSliding = slideProgress.value > 0.001 && slideProgress.value < 0.999;

        return {
            transform: `scale(${finalScale}) translateY(${translateY}px)`,
            transformOrigin: "center center",
            borderRadius: `${borderRadius}px`,
            overflow: "hidden",
            transition: isSliding
                ? "none"
                : "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        };
    });

    return {
        slideProgress,
        isPopupOpen,
        handleSlideProgress,
        handlePopupOpen,
        handlePopupClose,
        pageTransform,
    };
}
