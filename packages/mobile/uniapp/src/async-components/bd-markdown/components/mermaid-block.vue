<!--
 * Mermaid code block component
 * Supports preview and source code view switching, intelligent streaming input handling, drag and zoom functionality
 * @author BuildingAI Team
-->

<script setup lang="ts">
import { useMermaidCdn } from "../composables/use-mermaid-cdn";

// const BdButtonCopy = defineAsyncComponent(() => import("../../bd-button-copy/index.vue"));

interface Props {
    node: {
        type: "code_block";
        language: string;
        code: string;
        raw: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

const props = defineProps<Props>();

const { t } = useI18n();

const { getMermaid, initializeMermaid, selectedTheme } = useMermaidCdn();

const { copy } = useCopy();

const baseFixedCode = computed(() => {
    const code = props.node.code || "";
    return code.replace(/\]::([^:])/g, "]:::$1").replace(/:::subgraphNode$/gm, "::subgraphNode");
});

const isExpanded = shallowRef(true);
const isCopied = shallowRef(false);
const viewMode = shallowRef<"preview" | "source">("preview");

const mermaidContainerRef = ref<HTMLDivElement | null>(null);
const mermaidWrapperRef = ref<HTMLDivElement | null>(null);
const mermaidContentRef = ref<HTMLDivElement | null>(null);

let renderId = 0;

const zoom = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

const isRendering = ref(false);
const hasRenderedOnce = ref(false);
const hasRenderError = ref(false);
const mermaidOpacity = ref(1);

const containerHeight = ref("360px");

let currentWorkController: AbortController | null = null;
let previewPollTimeoutId: ReturnType<typeof setTimeout> | null = null;
let previewPollIdleId: number | null = null;
let isPreviewPolling = false;
let previewPollController: AbortController | null = null;
let lastPreviewStopAt = 0;
let allowPartialPreview = true;
let previewPollDelay = 800;

const RENDER_DEBOUNCE_DELAY = 300;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const WHEEL_SENSITIVITY = 0.01;
const DEFAULT_CONTAINER_HEIGHT = "360px";
const PARSE_TIMEOUT = 1800;
const RENDER_TIMEOUT = 2500;
const INIT_RENDER_TIMEOUT = 4000;

const transformStyle = computed(() => ({
    transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${zoom.value})`,
}));

function cleanMermaidCode(code: string): string {
    if (!code) return "";

    return code
        .split(/\r?\n/)
        .filter((line) => {
            const trimmed = line.trim();
            return !/^```\s*(mermaid|$)/i.test(trimmed);
        })
        .join("\n")
        .replace(/^```\s*mermaid(?::[^\n]*)?\s*\n?/i, "")
        .replace(/\n*```\s*$/g, "")
        .replace(/^```\s*$/gm, "")
        .replace(/^```\s+/gm, "")
        .replace(/\s+```$/gm, "")
        .trim();
}

function getSafePrefixCandidate(code: string): string {
    const cleaned = cleanMermaidCode(code);

    if (!cleaned.trim()) {
        return "";
    }

    const lines = cleaned.split(/\r?\n/);

    while (lines.length > 0) {
        const lastRaw = lines[lines.length - 1];
        if (!lastRaw) {
            lines.pop();
            continue;
        }

        const last = lastRaw.trimEnd();

        if (last === "") {
            lines.pop();
            continue;
        }

        const looksDangling =
            /^[-=~>|<\s]+$/.test(last.trim()) ||
            /(?:--|==|~~|->|<-|-\||-\)|-x|o-|\|-|\.-)\s*$/.test(last) ||
            /[-|><]$/.test(last) ||
            /(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt)\s*$/i.test(
                last,
            ) ||
            /[A-Za-z0-9_]+\[[^\]]*$/.test(last) ||
            /[A-Za-z0-9_]+\{[^}]*$/.test(last) ||
            /[A-Za-z0-9_]+\([^)]*$/.test(last) ||
            /[A-Za-z0-9_]+\(\([^)]*$/.test(last) ||
            /[A-Za-z0-9_]+\{.*\{[^}]*$/.test(last) ||
            /["'][^"']*$/.test(last);

        if (looksDangling) {
            lines.pop();
            continue;
        }

        break;
    }

    return lines.join("\n");
}

function canApplyPartialPreview() {
    return (
        allowPartialPreview &&
        viewMode.value === "preview" &&
        !hasRenderedOnce.value &&
        !hasRenderError.value
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
): { (...args: Parameters<T>): void; cancel: () => void } {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const debounced = (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func(...args), wait);
    };
    debounced.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };
    return debounced;
}

function withTimeoutSignal<T>(
    run: () => Promise<T>,
    opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<T> {
    const timeoutMs = opts?.timeoutMs;
    const signal = opts?.signal;

    if (signal?.aborted) {
        return Promise.reject(new DOMException("Aborted", "AbortError"));
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let abortHandler: ((this: AbortSignal, ev: Event) => any) | null = null;

    return new Promise<T>((resolve, reject) => {
        const cleanup = () => {
            if (timer != null) clearTimeout(timer);
            if (abortHandler && signal) signal.removeEventListener("abort", abortHandler);
        };

        if (timeoutMs && timeoutMs > 0) {
            timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(new Error("Operation timed out"));
            }, timeoutMs);
        }

        if (signal) {
            abortHandler = () => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(new DOMException("Aborted", "AbortError"));
            };
            signal.addEventListener("abort", abortHandler);
        }

        run()
            .then((res) => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(res);
            })
            .catch((err) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(err);
            });
    });
}

async function canParseOnMain(
    code: string,
    opts?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<boolean> {
    if (typeof window === "undefined") return false;

    const mermaid = await getMermaid();
    if (!mermaid) return false;

    if (typeof mermaid.parse === "function") {
        try {
            await withTimeoutSignal(() => mermaid.parse(code), {
                timeoutMs: opts?.timeoutMs ?? PARSE_TIMEOUT,
                signal: opts?.signal,
            });
            return true;
        } catch {
            return false;
        }
    }

    const id = `mermaid-parse-${Math.random().toString(36).slice(2, 9)}`;
    try {
        await withTimeoutSignal(() => mermaid.render(id, code), {
            timeoutMs: opts?.timeoutMs ?? RENDER_TIMEOUT,
            signal: opts?.signal,
        });
        return true;
    } catch {
        return false;
    }
}

const canParseOffthread = canParseOnMain;

async function canParseOrPrefix(
    code: string,
    opts?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<{ fullOk: boolean; prefixOk: boolean; prefix?: string }> {
    try {
        const fullOk = await canParseOffthread(code, opts);
        if (fullOk) return { fullOk: true, prefixOk: false };
    } catch (e: unknown) {
        if (e?.name === "AbortError") throw e;
    }

    const prefix = getSafePrefixCandidate(code);
    if (prefix && prefix.trim() && prefix !== code) {
        try {
            const ok = await canParseOffthread(prefix, opts);
            if (ok) return { fullOk: false, prefixOk: true, prefix };
        } catch (e: unknown) {
            if (e?.name === "AbortError") throw e;
        }
    }

    return { fullOk: false, prefixOk: false };
}

async function renderMermaidDiagram(
    code: string,
    options: { isPartial?: boolean; timeout?: number } = {},
) {
    const { isPartial = false, timeout = isPartial ? RENDER_TIMEOUT : INIT_RENDER_TIMEOUT } =
        options;

    if (typeof window === "undefined" || !mermaidContentRef.value) return;

    const mermaid = await getMermaid();
    if (!mermaid) return;

    const contentRef = mermaidContentRef.value;
    const id = `mermaid-${isPartial ? "partial" : "full"}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
    const codeForRender = isPartial ? getSafePrefixCandidate(code) || code : code;

    contentRef.style.opacity = "0";

    try {
        const res = await withTimeoutSignal(() => mermaid.render(id, codeForRender, contentRef), {
            timeoutMs: timeout,
        });

        if (res?.svg) {
            contentRef.innerHTML = res.svg;
            if (res.bindFunctions) {
                res.bindFunctions(contentRef);
            }
            if (!isPartial) {
                updateContainerHeight();
                hasRenderedOnce.value = true;
            }
            hasRenderError.value = false;
        }
    } catch (error) {
        if (!isPartial) {
            console.error("Failed to render mermaid diagram:", error);
            renderErrorToContainer(error);
        }
    } finally {
        await nextTick();
        contentRef.style.opacity = "1";
    }
}

async function renderPartial(code: string) {
    if (!canApplyPartialPreview() || isRendering.value) return;

    await nextTick();
    if (!mermaidContentRef.value) return;

    isRendering.value = true;
    try {
        await renderMermaidDiagram(code, { isPartial: true });
    } finally {
        isRendering.value = false;
    }
}

async function initMermaid() {
    if (isRendering.value || typeof window === "undefined") return;

    await nextTick();
    if (!mermaidContentRef.value) {
        console.warn("Mermaid container not ready");
        return;
    }

    isRendering.value = true;
    try {
        await renderMermaidDiagram(baseFixedCode.value, { isPartial: false });
    } finally {
        isRendering.value = false;
    }
}

function renderErrorToContainer(error: unknown) {
    if (typeof document === "undefined") return;
    if (!mermaidContentRef.value) return;

    const errorDiv = document.createElement("div");
    errorDiv.className = "text-red-500 p-4 text-sm";
    errorDiv.textContent = "Failed to render diagram: ";
    const errorSpan = document.createElement("span");
    errorSpan.textContent = error instanceof Error ? error.message : "Unknown error";
    errorDiv.appendChild(errorSpan);

    mermaidContentRef.value.innerHTML = "";
    mermaidContentRef.value.appendChild(errorDiv);
    containerHeight.value = DEFAULT_CONTAINER_HEIGHT;
    hasRenderError.value = true;

    stopPreviewPolling();
}

function updateContainerHeight(newContainerWidth?: number) {
    if (!mermaidContainerRef.value || !mermaidContentRef.value) return;

    const svgElement = mermaidContentRef.value.querySelector("svg");
    if (!svgElement) return;

    let intrinsicWidth = 0;
    let intrinsicHeight = 0;

    const viewBox = svgElement.getAttribute("viewBox");
    const attrWidth = svgElement.getAttribute("width");
    const attrHeight = svgElement.getAttribute("height");

    if (viewBox) {
        const parts = viewBox.split(" ");
        if (parts.length === 4) {
            intrinsicWidth = Number.parseFloat(parts[2] || "0");
            intrinsicHeight = Number.parseFloat(parts[3] || "0");
        }
    }

    if (!intrinsicWidth || !intrinsicHeight) {
        if (attrWidth && attrHeight) {
            intrinsicWidth = Number.parseFloat(attrWidth || "0");
            intrinsicHeight = Number.parseFloat(attrHeight || "0");
        }
    }

    if (
        Number.isNaN(intrinsicWidth) ||
        Number.isNaN(intrinsicHeight) ||
        intrinsicWidth <= 0 ||
        intrinsicHeight <= 0
    ) {
        try {
            const bbox = svgElement.getBBox();
            if (bbox && bbox.width > 0 && bbox.height > 0) {
                intrinsicWidth = bbox.width;
                intrinsicHeight = bbox.height;
            }
        } catch (e) {
            console.error("Failed to get SVG BBox:", e);
            return;
        }
    }

    if (intrinsicWidth > 0 && intrinsicHeight > 0) {
        const aspectRatio = intrinsicHeight / intrinsicWidth;
        const containerWidth = newContainerWidth ?? mermaidContainerRef.value.clientWidth;
        let newHeight = containerWidth * aspectRatio;
        if (newHeight > intrinsicHeight) {
            newHeight = intrinsicHeight;
        }
        containerHeight.value = `${newHeight}px`;
    }
}

async function progressiveRender() {
    const scheduledAt = Date.now();
    const token = ++renderId;

    if (currentWorkController) {
        currentWorkController.abort();
    }

    currentWorkController = new AbortController();
    const signal = currentWorkController.signal;

    const base = baseFixedCode.value;

    if (!base.trim()) {
        if (mermaidContentRef.value) {
            mermaidContentRef.value.innerHTML = "";
        }
        hasRenderError.value = false;
        return;
    }

    try {
        const res = await canParseOrPrefix(base, { signal, timeoutMs: 1400 });

        if (renderId !== token) return;

        if (res.fullOk) {
            await initMermaid();
            if (renderId === token) {
                hasRenderError.value = false;
            }
            return;
        }

        if (renderId !== token) return;

        const justStopped = lastPreviewStopAt && scheduledAt <= lastPreviewStopAt;
        if (res.prefixOk && res.prefix && canApplyPartialPreview() && !justStopped) {
            await renderPartial(res.prefix);
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        if (e?.name === "AbortError") return;
    }

    if (renderId !== token) return;
    if (hasRenderError.value) return;
}

const debouncedProgressiveRender = debounce(() => {
    const requestIdle =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).requestIdleCallback ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((cb: any) => setTimeout(() => cb({ didTimeout: true }), 16));

    requestIdle(
        () => {
            progressiveRender();
        },
        { timeout: 500 },
    );
}, RENDER_DEBOUNCE_DELAY);

function stopPreviewPolling() {
    if (!isPreviewPolling) return;

    isPreviewPolling = false;
    previewPollDelay = 800;
    allowPartialPreview = false;

    if (previewPollController) {
        previewPollController.abort();
        previewPollController = null;
    }

    if (previewPollTimeoutId) {
        clearTimeout(previewPollTimeoutId);
        previewPollTimeoutId = null;
    }

    if (previewPollIdleId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cancelIdle = (globalThis as any).cancelIdleCallback ?? clearTimeout;
        cancelIdle(previewPollIdleId);
        previewPollIdleId = null;
    }

    lastPreviewStopAt = Date.now();
}

function scheduleNextPreviewPoll(delay = 800) {
    if (!isPreviewPolling) return;

    if (previewPollTimeoutId) {
        clearTimeout(previewPollTimeoutId);
    }

    previewPollTimeoutId = setTimeout(() => {
        const requestIdle =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).requestIdleCallback ??
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((cb: any) => setTimeout(() => cb({ didTimeout: true }), 16));

        previewPollIdleId = requestIdle(
            async () => {
                if (!isPreviewPolling) return;
                if (viewMode.value === "source" || hasRenderedOnce.value) {
                    stopPreviewPolling();
                    return;
                }

                const base = baseFixedCode.value;
                if (!base.trim()) {
                    scheduleNextPreviewPoll(previewPollDelay);
                    return;
                }

                if (previewPollController) {
                    previewPollController.abort();
                }

                previewPollController = new AbortController();

                try {
                    const ok = await canParseOffthread(base, {
                        signal: previewPollController.signal,
                        timeoutMs: 1400,
                    });

                    if (ok) {
                        await initMermaid();
                        if (hasRenderedOnce.value) {
                            stopPreviewPolling();
                            return;
                        }
                    }
                } catch {
                    // Ignore errors and continue polling
                }

                previewPollDelay = Math.min(Math.floor(previewPollDelay * 1.5), 4000);
                scheduleNextPreviewPoll(previewPollDelay);
            },
            { timeout: 500 },
        ) as unknown as number;
    }, delay);
}

function startPreviewPolling() {
    if (isPreviewPolling) return;
    if (viewMode.value === "source" || hasRenderedOnce.value) return;

    isPreviewPolling = true;
    lastPreviewStopAt = 0;
    allowPartialPreview = true;
    scheduleNextPreviewPoll(500);
}

function getClientCoordinates(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
    if (e instanceof MouseEvent) {
        return { x: e.clientX, y: e.clientY };
    }
    if (e.touches?.[0]) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return null;
}

function startDrag(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    isDragging.value = true;

    const coords = getClientCoordinates(e);
    if (!coords) return;

    dragStart.value = {
        x: coords.x - translateX.value,
        y: coords.y - translateY.value,
    };

    if (e instanceof MouseEvent && typeof window !== "undefined") {
        window.addEventListener("mousemove", onDrag);
        window.addEventListener("mouseup", stopDrag);
    }
}

function onDrag(e: MouseEvent | TouchEvent) {
    if (!isDragging.value) return;

    e.preventDefault();

    const coords = getClientCoordinates(e);
    if (!coords) return;

    translateX.value = coords.x - dragStart.value.x;
    translateY.value = coords.y - dragStart.value.y;
}

function stopDrag(e?: MouseEvent | TouchEvent) {
    if (e) {
        e.preventDefault();
    }

    isDragging.value = false;

    if (typeof window !== "undefined") {
        window.removeEventListener("mousemove", onDrag);
        window.removeEventListener("mouseup", stopDrag);
    }
}

function handleWheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        if (!mermaidContainerRef.value) return;

        const rect = mermaidContainerRef.value.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const containerCenterX = rect.width / 2;
        const containerCenterY = rect.height / 2;

        const offsetX = mouseX - containerCenterX;
        const offsetY = mouseY - containerCenterY;

        const contentMouseX = (offsetX - translateX.value) / zoom.value;
        const contentMouseY = (offsetY - translateY.value) / zoom.value;

        const delta = -event.deltaY * WHEEL_SENSITIVITY;
        const newZoom = Math.min(Math.max(zoom.value + delta, ZOOM_MIN), ZOOM_MAX);

        if (newZoom !== zoom.value) {
            translateX.value = offsetX - contentMouseX * newZoom;
            translateY.value = offsetY - contentMouseY * newZoom;
            zoom.value = newZoom;
        }
    }
}

function switchMode(target: "preview" | "source") {
    viewMode.value = target === "preview" ? "preview" : "source";
}

function toggleExpand() {
    isExpanded.value = !isExpanded.value;
}

async function handleCopy() {
    try {
        await copy(baseFixedCode.value);
        isCopied.value = true;
        setTimeout(() => {
            isCopied.value = false;
        }, 2000);
    } catch (error) {
        console.error("Failed to copy code:", error);
    }
}

watch(
    () => baseFixedCode.value,
    () => {
        hasRenderedOnce.value = false;
        debouncedProgressiveRender();

        if (viewMode.value === "preview") {
            startPreviewPolling();
        }
    },
);

watch(viewMode, (newValue) => {
    if (!newValue) {
        if (hasRenderError.value) {
            return;
        }

        if (hasRenderedOnce.value) {
            nextTick(() => {
                if (mermaidContentRef.value) {
                    const svg = mermaidContentRef.value.querySelector("svg");
                    if (svg) {
                        mermaidContentRef.value.innerHTML = svg.outerHTML;
                    }
                }
            });
            return;
        }

        nextTick(() => {
            progressiveRender();
        });

        startPreviewPolling();
    } else {
        stopPreviewPolling();
    }
});

async function setupMermaid() {
    if (typeof window === "undefined") return;
    await initializeMermaid();
}

onMounted(async () => {
    await setupMermaid();
    await nextTick();
    await nextTick();
    if (mermaidContentRef.value && baseFixedCode.value.trim() && viewMode.value === "preview") {
        try {
            await initMermaid();
        } catch (error) {
            console.error("Failed to render mermaid on mount:", error);
            debouncedProgressiveRender();
            startPreviewPolling();
        }
    }
});

watch(
    () => selectedTheme.value,
    () => {
        setupMermaid();
        if (hasRenderedOnce.value && viewMode.value === "preview") {
            hasRenderedOnce.value = false;
            nextTick(() => {
                initMermaid();
            });
        }
    },
);

onUnmounted(() => {
    stopPreviewPolling();

    if (currentWorkController) {
        currentWorkController.abort();
        currentWorkController = null;
    }

    debouncedProgressiveRender.cancel();

    if (typeof window !== "undefined") {
        window.removeEventListener("mousemove", onDrag);
        window.removeEventListener("mouseup", stopDrag);
    }

    renderId++;
});
</script>

<template>
    <view class="bd-markdown-code-wrapper">
        <view
            class="bd-markdown-code-header bd-markdown-mermaid-header"
            :class="{ 'rounded-lg!': !isExpanded }"
        >
            <view
                class="bd-markdown-view-toggle flex items-center rounded-md bg-gray-200 p-0.5 dark:bg-gray-700"
            >
                <view
                    class="flex flex-1 items-center justify-center rounded px-2 py-1 text-xs transition-all"
                    :class="{
                        'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100':
                            viewMode === 'preview',
                        'text-gray-500 dark:text-gray-400': viewMode !== 'preview',
                    }"
                    @click="switchMode('preview')"
                >
                    <text>{{ t("common.preview") }}</text>
                </view>
                <view
                    class="flex flex-1 items-center justify-center rounded px-2 py-1 text-xs transition-all"
                    :class="{
                        'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100':
                            viewMode === 'source',
                        'text-gray-500 dark:text-gray-400': viewMode !== 'source',
                    }"
                    @click="switchMode('source')"
                >
                    <text>{{ t("common.source") }}</text>
                </view>
            </view>

            <view class="flex items-center gap-1">
                <view class="flex items-center gap-1 p-1" @click="toggleExpand">
                    <text :class="isExpanded ? 'i-lucide-chevrons-up' : 'i-lucide-chevrons-down'" />
                    <view class="pt-px">
                        {{ isExpanded ? t("common.collapse") : t("common.expand") }}
                    </view>
                </view>
                <view class="flex items-center gap-1 p-1" @click="handleCopy">
                    <view :class="isCopied ? 'i-lucide-check' : 'i-lucide-copy'" class="text-xs" />
                    <view class="pt-px">
                        {{ isCopied ? t("common.message.copySuccess") : t("common.copy") }}
                    </view>
                </view>
            </view>
        </view>

        <view
            class="overflow-hidden transition-all duration-300"
            :class="{
                'max-h-0 py-0': !isExpanded,
            }"
        >
            <!-- Mermaid source code mode -->
            <view
                v-show="viewMode === 'source'"
                class="bd-markdown-code-source bg-muted rounded-b-lg p-2"
            >
                <text>{{ baseFixedCode }}</text>
            </view>

            <!-- Mermaid preview mode -->
            <view
                v-show="viewMode === 'preview'"
                class="relative"
                @touchstart.stop
                @touchmove.stop
                @touchend.stop
            >
                <!-- Mermaid container -->
                <div
                    ref="mermaidContainerRef"
                    class="relative overflow-hidden bg-gray-50 dark:bg-gray-900"
                    :style="isExpanded ? { height: containerHeight, minHeight: '360px' } : {}"
                    @wheel="handleWheel"
                    @mousedown="startDrag"
                    @touchstart="startDrag"
                    @touchmove="onDrag"
                    @touchend="stopDrag"
                >
                    <div
                        ref="mermaidWrapperRef"
                        class="absolute inset-0 flex items-center justify-center"
                        :class="{ 'cursor-grabbing': isDragging, 'cursor-grab': !isDragging }"
                        :style="transformStyle"
                    >
                        <div
                            ref="mermaidContentRef"
                            class="flex w-full items-center justify-center text-center transition-opacity duration-200 ease-in-out"
                            :style="{ opacity: mermaidOpacity }"
                        />
                    </div>
                </div>
            </view>
        </view>
    </view>
</template>
