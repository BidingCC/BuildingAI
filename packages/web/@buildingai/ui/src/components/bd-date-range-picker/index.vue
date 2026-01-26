<script setup lang="ts">
import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import type { Composer } from "vue-i18n";

import { formatDate, mergeTimeToDate, parseDateValue, parseToDate } from "../../utils/date-format";
import BdTimePicker from "../bd-time-picker/index.vue";
import type { DateRangePickerEmits, DateRangePickerProps } from "./types";

const { $i18n } = useNuxtApp();
const { t, locale } = $i18n as Composer;

const props = withDefaults(defineProps<DateRangePickerProps>(), {
    start: null,
    end: null,
    dateStyle: "medium",
    disabled: false,
    readonly: false,
    clearable: true,
    size: "md",
    icon: "i-lucide-calendar-range",
    placement: "bottom",
    numberOfMonths: 2,
    showTime: false,
    timeFormat: "HH:mm:ss",
    defaultStartTime: "",
    defaultEndTime: "",
});

const emit = defineEmits<DateRangePickerEmits>();

/** Whether the popup panel is open */
const isOpen = ref(false);

/** Current selected date range */
const selectedRange = shallowRef<{
    start: CalendarDate | undefined;
    end: CalendarDate | undefined;
}>({
    start: undefined,
    end: undefined,
});

/** Current selected start and end time */
const selectedStartTime = ref<Date | null>(null);
const selectedEndTime = ref<Date | null>(null);

/** Formatted start and end date display */
const formattedStartDate = computed(() =>
    formatDate(props.start, locale.value, props.dateStyle, "short", false),
);
const formattedEndDate = computed(() =>
    formatDate(props.end, locale.value, props.dateStyle, "short", false),
);

/** Initialize the value of the date selector */
const initDateValue = () => {
    // Parse start date and end date
    const start = parseDateValue(props.start);
    const end = parseDateValue(props.end);

    // Update selected range
    selectedRange.value = {
        start: start ?? undefined,
        end: end ?? undefined,
    };

    // Initialize time selector
    if (props.showTime) {
        // Initialize start time
        if (props.start) {
            selectedStartTime.value = initTimeValue(props.start);
        } else if (props.defaultStartTime) {
            const defaultStartTimeDate = parseToDate(props.defaultStartTime);
            if (defaultStartTimeDate) {
                selectedStartTime.value = defaultStartTimeDate;
            }
        } else {
            selectedStartTime.value = null;
        }

        // Initialize end time
        if (props.end) {
            selectedEndTime.value = initTimeValue(props.end);
        } else if (props.defaultEndTime) {
            const defaultEndTimeDate = parseToDate(props.defaultEndTime);
            if (defaultEndTimeDate) {
                selectedEndTime.value = defaultEndTimeDate;
            }
        } else {
            selectedEndTime.value = null;
        }
    }
};

/** Handle popup panel status update */
const handlePopoverUpdate = (val: boolean) => {
    if (val) {
        emit("open");
        nextTick(() => {
            initDateValue();
        });
    } else {
        emit("close");
    }
};

/** Handle clear button click */
const handleClear = (event: Event) => {
    if (props.disabled || props.readonly) return;
    event.stopPropagation();

    // Clear selected and confirmed values
    selectedRange.value = { start: undefined, end: undefined };
    selectedStartTime.value = null;
    selectedEndTime.value = null;

    // Trigger events
    emit("update:start", null);
    emit("update:end", null);
    emit("clear");
    emit("change", null, null);
    isOpen.value = false;
};

/** Handle confirm button click */
const handleConfirm = () => {
    // Convert date and apply time
    const startDate = selectedRange.value.start?.toDate(getLocalTimeZone());
    const endDate = selectedRange.value.end?.toDate(getLocalTimeZone());

    // Get time value, use defaultTime if selectedTime is null
    let startTimeValue = selectedStartTime.value;
    let endTimeValue = selectedEndTime.value;
    if (props.showTime) {
        if (startDate && !startTimeValue && props.defaultStartTime) {
            startTimeValue = parseToDate(props.defaultStartTime);
        }
        if (endDate && !endTimeValue && props.defaultEndTime) {
            endTimeValue = parseToDate(props.defaultEndTime);
        }
    }

    // Apply time component
    if (startDate) {
        mergeTimeToDate(startDate, props.showTime ? startTimeValue : null);
    }

    if (endDate) {
        mergeTimeToDate(endDate, props.showTime ? endTimeValue : null);
    }

    // Trigger events and close popup panel
    emit("update:start", startDate || null);
    emit("update:end", endDate || null);
    emit("confirm", startDate || null, endDate || null);
    emit("change", startDate || null, endDate || null);
    isOpen.value = false;
};

/** Handle cancel button click */
const handleCancel = () => {
    // Restore to the previously confirmed value
    selectedRange.value = { start: undefined, end: undefined };
    selectedStartTime.value = null;
    selectedEndTime.value = null;

    emit("cancel");
    emit("change", null, null);
    isOpen.value = false;
};

/** Set date range shortcut */
const setDateRange = (days = 0, months = 0) => {
    const today = new CalendarDate(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        new Date().getDate(),
    );
    const end = today;

    // Create start date, according to the specified number of days or months
    let start: CalendarDate;
    if (days > 0) {
        start = today.subtract({ days });
    } else if (months > 0) {
        start = today.subtract({ months });
    } else {
        start = today;
    }

    selectedRange.value = { start, end };
};

/** Initialize time value */
const initTimeValue = (dateValue: Date | string | number | null): Date => {
    if (!dateValue) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
    }

    return parseToDate(dateValue) || new Date();
};

/** Watch props changes */
watch([() => props.start, () => props.end], () => {
    if (!isOpen.value) {
        initDateValue();
    }
});

/** Watch selectedRange changes and apply defaultTime if needed */
watch(
    () => selectedRange.value,
    (newRange) => {
        if (props.showTime) {
            // Apply default start time if start date is selected but no time
            if (newRange.start && !selectedStartTime.value && props.defaultStartTime) {
                const defaultStartTimeDate = parseToDate(props.defaultStartTime);
                if (defaultStartTimeDate) {
                    selectedStartTime.value = defaultStartTimeDate;
                }
            }

            // Apply default end time if end date is selected but no time
            if (newRange.end && !selectedEndTime.value && props.defaultEndTime) {
                const defaultEndTimeDate = parseToDate(props.defaultEndTime);
                if (defaultEndTimeDate) {
                    selectedEndTime.value = defaultEndTimeDate;
                }
            }
        }
    },
    { deep: true },
);

/** Watch isOpen changes */
watch(() => isOpen.value, handlePopoverUpdate);

/** Initialize date value when component is mounted */
onMounted(initDateValue);
</script>

<template>
    <div
        class="bd-date-range-picker relative inline-flex"
        :class="[size, { 'cursor-not-allowed opacity-60': disabled }]"
    >
        <UPopover
            v-model:open="isOpen"
            :disabled="disabled || readonly"
            :placement="placement"
            :ui="{ content: 'w-auto' }"
        >
            <!-- Input box trigger -->
            <div class="relative w-full" :class="ui?.root">
                <UInput
                    placeholder=""
                    :disabled="disabled"
                    :readonly="true"
                    :size="size"
                    :color="color"
                    :variant="variant"
                    :class="{ 'cursor-default': readonly }"
                    :ui="{
                        ...ui,
                        root: ui?.root || 'w-full',
                        base: `${isOpen ? 'ring-2 ring-inset ring-primary' : ''} text-left ${ui?.base}`,
                    }"
                >
                    <template #leading>
                        <UIcon :name="icon" class="text-dimmed" />
                        <div
                            class="text-dimmed ml-3 flex items-center justify-between text-sm select-none"
                            :class="formattedStartDate ? 'text-highlighted' : 'text-dimmed'"
                        >
                            <template v-if="formattedStartDate">
                                <span>{{ formattedStartDate }}</span>
                                <span class="mx-4">-</span>
                                <span>{{ formattedEndDate }}</span>
                            </template>
                            <template v-else>
                                {{ t("common.placeholder.dateRange") }}
                            </template>
                        </div>
                    </template>
                    <template #trailing>
                        <UButton
                            v-if="clearable && !disabled && !readonly && formattedStartDate"
                            color="neutral"
                            variant="ghost"
                            icon="i-lucide-x"
                            :padded="false"
                            size="xs"
                            @click.stop="handleClear"
                        />
                    </template>
                </UInput>
            </div>

            <template #content>
                <div class="p-4">
                    <div class="flex">
                        <!-- Shortcut button -->
                        <div class="flex flex-col gap-2 pr-3">
                            <UButton
                                :label="t('common.time.lastNDays', { n: 7 })"
                                size="xs"
                                color="neutral"
                                variant="soft"
                                @click="setDateRange(7)"
                            />
                            <UButton
                                :label="t('common.time.lastNDays', { n: 15 })"
                                size="xs"
                                color="neutral"
                                variant="soft"
                                @click="setDateRange(15)"
                            />
                            <UButton
                                :label="t('common.time.lastNDays', { n: 30 })"
                                size="xs"
                                color="neutral"
                                variant="soft"
                                @click="setDateRange(30)"
                            />
                            <UButton
                                :label="t('common.time.lastNMonth', { n: 3 })"
                                size="xs"
                                color="neutral"
                                variant="soft"
                                @click="setDateRange(0, 3)"
                            />
                            <UButton
                                :label="t('common.time.lastNMonth', { n: 6 })"
                                size="xs"
                                color="neutral"
                                variant="soft"
                                @click="setDateRange(0, 6)"
                            />
                        </div>

                        <div>
                            <!-- Calendar body -->
                            <UCalendar
                                v-model="selectedRange"
                                range
                                :fixedWeeks="false"
                                :number-of-months="numberOfMonths"
                                color="primary"
                                size="sm"
                                :locale="locale"
                            />

                            <!-- Time selector (optional) -->
                            <div v-if="showTime" class="mt-2 grid grid-cols-2 gap-4">
                                <BdTimePicker
                                    v-model="selectedStartTime"
                                    :format="timeFormat"
                                    :disabled="disabled"
                                    :readonly="readonly"
                                    :clearable="false"
                                    size="sm"
                                    :ui="{ root: 'w-full' }"
                                />
                                <BdTimePicker
                                    v-model="selectedEndTime"
                                    :format="timeFormat"
                                    :disabled="disabled"
                                    :readonly="readonly"
                                    :clearable="false"
                                    size="sm"
                                    :ui="{ root: 'w-full' }"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Operation button area -->
                    <div class="flex justify-end gap-2 pt-2">
                        <UButton
                            size="sm"
                            variant="ghost"
                            icon="i-lucide-x"
                            @click="handleCancel"
                        />
                        <UButton
                            size="sm"
                            icon="i-lucide-check"
                            :disabled="!selectedRange.start && !disabled"
                            @click="handleConfirm"
                        />
                    </div>
                </div>
            </template>
        </UPopover>
    </div>
</template>
