<script>
/**
 * DataChecklist 数据选择器
 * @description 通过数据渲染 checkbox 和 radio
 * @tutorial https://ext.dcloud.net.cn/plugin?id=xxx
 * @property {String} mode = [default| list | button | tag] 显示模式
 * @value default  	默认横排模式
 * @value list		列表模式
 * @value button	按钮模式
 * @value tag 		标签模式
 * @property {Boolean} multiple = [true|false] 是否多选
 * @property {Array|String|Number} value 默认值
 * @property {Array} localdata 本地数据 ，格式 [{text:'',value:''}]
 * @property {Number|String} min 最小选择个数 ，multiple为true时生效
 * @property {Number|String} max 最大选择个数 ，multiple为true时生效
 * @property {Boolean} wrap 是否换行显示
 * @property {String} icon = [left|right]  list 列表模式下icon显示位置
 * @property {Boolean} selectedColor 选中颜色
 * @property {Boolean} emptyText 没有数据时显示的文字 ，本地数据无效
 * @property {Boolean} selectedTextColor 选中文本颜色，如不填写则自动显示
 * @property {Object} map 字段映射， 默认 map={text:'text',value:'value'}
 * @value left 左侧显示
 * @value right 右侧显示
 * @event {Function} change  选中发生变化触发
 */

export default {
    name: "uniDataChecklist",
    mixins: [uniCloud.mixinDatacom || {}],
    emits: ["input", "update:modelValue", "change"],
    props: {
        mode: {
            type: String,
            default: "default",
        },

        multiple: {
            type: Boolean,
            default: false,
        },
        value: {
            type: [Array, String, Number],
            default() {
                return "";
            },
        },
        // TODO vue3
        modelValue: {
            type: [Array, String, Number],
            default() {
                return "";
            },
        },
        localdata: {
            type: Array,
            default() {
                return [];
            },
        },
        min: {
            type: [Number, String],
            default: "",
        },
        max: {
            type: [Number, String],
            default: "",
        },
        wrap: {
            type: Boolean,
            default: false,
        },
        icon: {
            type: String,
            default: "left",
        },
        selectedColor: {
            type: String,
            default: "",
        },
        selectedTextColor: {
            type: String,
            default: "",
        },
        emptyText: {
            type: String,
            default: "暂无数据",
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        map: {
            type: Object,
            default() {
                return {
                    text: "text",
                    value: "value",
                };
            },
        },
    },
    watch: {
        localdata: {
            handler(newVal) {
                this.range = newVal;
                this.dataList = this.getDataList(this.getSelectedValue(newVal));
            },
            deep: true,
        },
        mixinDatacomResData(newVal) {
            this.range = newVal;
            this.dataList = this.getDataList(this.getSelectedValue(newVal));
        },
        value(newVal) {
            this.dataList = this.getDataList(newVal);
            // fix by mehaotian is_reset 在 uni-forms 中定义
            // if(!this.is_reset){
            // 	this.is_reset = false
            // 	this.formItem && this.formItem.setValue(newVal)
            // }
        },
        modelValue(newVal) {
            this.dataList = this.getDataList(newVal);
            // if(!this.is_reset){
            // 	this.is_reset = false
            // 	this.formItem && this.formItem.setValue(newVal)
            // }
        },
    },
    data() {
        return {
            dataList: [],
            range: [],
            contentText: {
                contentdown: "查看更多",
                contentrefresh: "加载中",
                contentnomore: "没有更多",
            },
            isLocal: true,
            styles: {
                selectedColor: "var(--primary-500)",
                selectedTextColor: "var(--muted-foreground)",
            },
            isTop: 0,
        };
    },
    computed: {
        dataValue() {
            if (this.value === "") return this.modelValue;
            if (this.modelValue === "") return this.value;
            return this.value;
        },
    },
    created() {
        // this.form = this.getForm('uniForms')
        // this.formItem = this.getForm('uniFormsItem')
        // this.formItem && this.formItem.setValue(this.value)

        // if (this.formItem) {
        // 	this.isTop = 6
        // 	if (this.formItem.name) {
        // 		// 如果存在name添加默认值,否则formData 中不存在这个字段不校验
        // 		if(!this.is_reset){
        // 			this.is_reset = false
        // 			this.formItem.setValue(this.dataValue)
        // 		}
        // 		this.rename = this.formItem.name
        // 		this.form.inputChildrens.push(this)
        // 	}
        // }

        if (this.localdata && this.localdata.length !== 0) {
            this.isLocal = true;
            this.range = this.localdata;
            this.dataList = this.getDataList(this.getSelectedValue(this.range));
        } else {
            if (this.collection) {
                this.isLocal = false;
                this.loadData();
            }
        }
    },
    methods: {
        loadData() {
            this.mixinDatacomGet()
                .then((res) => {
                    this.mixinDatacomResData = res.result.data;
                    if (this.mixinDatacomResData.length === 0) {
                        this.isLocal = false;
                        this.mixinDatacomErrorMessage = this.emptyText;
                    } else {
                        this.isLocal = true;
                    }
                })
                .catch((err) => {
                    this.mixinDatacomErrorMessage = err.message;
                });
        },
        /**
         * 获取父元素实例
         */
        getForm(name = "uniForms") {
            let parent = this.$parent;
            let parentName = parent.$options.name;
            while (parentName !== name) {
                parent = parent.$parent;
                if (!parent) return false;
                parentName = parent.$options.name;
            }
            return parent;
        },
        change(e) {
            const values = e.detail.value;

            let detail = {
                value: [],
                data: [],
            };

            if (this.multiple) {
                this.range.forEach((item) => {
                    if (values.includes(item[this.map.value] + "")) {
                        detail.value.push(item[this.map.value]);
                        detail.data.push(item);
                    }
                });
            } else {
                const range = this.range.find((item) => item[this.map.value] + "" === values);
                if (range) {
                    detail = {
                        value: range[this.map.value],
                        data: range,
                    };
                }
            }
            // this.formItem && this.formItem.setValue(detail.value)
            // TODO 兼容 vue2
            this.$emit("input", detail.value);
            // // TOTO 兼容 vue3
            this.$emit("update:modelValue", detail.value);
            this.$emit("change", {
                detail,
            });
            if (this.multiple) {
                // 如果 v-model 没有绑定 ，则走内部逻辑
                // if (this.value.length === 0) {
                this.dataList = this.getDataList(detail.value, true);
                // }
            } else {
                this.dataList = this.getDataList(detail.value);
            }
        },

        /**
         * 获取渲染的新数组
         * @param {Object} value 选中内容
         */
        getDataList(value) {
            // 解除引用关系，破坏原引用关系，避免污染源数据
            const dataList = JSON.parse(JSON.stringify(this.range));
            const list = [];
            if (this.multiple) {
                if (!Array.isArray(value)) {
                    value = [];
                }
            } else {
                if (Array.isArray(value) && value.length) {
                    value = value[0];
                }
            }
            dataList.forEach((item, index) => {
                item.disabled = item.disable || item.disabled || false;
                if (this.multiple) {
                    if (value.length > 0) {
                        const have = value.find((val) => val === item[this.map.value]);
                        item.selected = have !== undefined;
                    } else {
                        item.selected = false;
                    }
                } else {
                    item.selected = value === item[this.map.value];
                }

                list.push(item);
            });
            return this.setRange(list);
        },
        /**
         * 处理最大最小值
         * @param {Object} list
         */
        setRange(list) {
            const selectList = list.filter((item) => item.selected);
            const min = Number(this.min) || 0;
            const max = Number(this.max) || "";
            list.forEach((item, index) => {
                if (this.multiple) {
                    if (selectList.length <= min) {
                        const have = selectList.find(
                            (val) => val[this.map.value] === item[this.map.value],
                        );
                        if (have !== undefined) {
                            item.disabled = true;
                        }
                    }

                    if (selectList.length >= max && max !== "") {
                        const have = selectList.find(
                            (val) => val[this.map.value] === item[this.map.value],
                        );
                        if (have === undefined) {
                            item.disabled = true;
                        }
                    }
                }
                this.setStyles(item, index);
                list[index] = item;
            });
            return list;
        },
        /**
         * 设置 class
         * @param {Object} item
         * @param {Object} index
         */
        setStyles(item, index) {
            //  设置自定义样式
            item.styleBackgroud = this.setStyleBackgroud(item);
            item.styleIcon = this.setStyleIcon(item);
            item.styleIconText = this.setStyleIconText(item);
            item.styleRightIcon = this.setStyleRightIcon(item);
        },

        /**
         * 获取选中值
         * @param {Object} range
         */
        getSelectedValue(range) {
            if (!this.multiple) return this.dataValue;
            const selectedArr = [];
            range.forEach((item) => {
                if (item.selected) {
                    selectedArr.push(item[this.map.value]);
                }
            });
            return this.dataValue.length > 0 ? this.dataValue : selectedArr;
        },

        /**
         * 设置背景样式
         */
        setStyleBackgroud(item) {
            const styles = {};
            const selectedColor = this.selectedColor ? this.selectedColor : "#2979ff";
            if (this.selectedColor) {
                if (this.mode !== "list") {
                    styles["border-color"] = item.selected ? selectedColor : "#DCDFE6";
                }
                if (this.mode === "tag") {
                    styles["background-color"] = item.selected ? selectedColor : "#f5f5f5";
                }
            }
            let classles = "";
            for (const i in styles) {
                classles += `${i}:${styles[i]};`;
            }
            return classles;
        },
        setStyleIcon(item) {
            const styles = {};
            let classles = "";
            if (this.selectedColor) {
                const selectedColor = this.selectedColor ? this.selectedColor : "#2979ff";
                styles["background-color"] = item.selected ? selectedColor : "#fff";
                styles["border-color"] = item.selected ? selectedColor : "#DCDFE6";

                if (!item.selected && item.disabled) {
                    styles["background-color"] = "#F2F6FC";
                    styles["border-color"] = item.selected ? selectedColor : "#DCDFE6";
                }
            }
            for (const i in styles) {
                classles += `${i}:${styles[i]};`;
            }
            return classles;
        },
        setStyleIconText(item) {
            const styles = {};
            let classles = "";
            if (this.selectedColor) {
                const selectedColor = this.selectedColor ? this.selectedColor : "#2979ff";
                if (this.mode === "tag") {
                    styles.color = item.selected
                        ? this.selectedTextColor
                            ? this.selectedTextColor
                            : "#fff"
                        : "#666";
                } else {
                    styles.color = item.selected
                        ? this.selectedTextColor
                            ? this.selectedTextColor
                            : selectedColor
                        : "#666";
                }
                if (!item.selected && item.disabled) {
                    styles.color = "#999";
                }
            }
            for (const i in styles) {
                classles += `${i}:${styles[i]};`;
            }
            return classles;
        },
        setStyleRightIcon(item) {
            const styles = {};
            let classles = "";
            if (this.mode === "list") {
                styles["border-color"] = item.selected ? this.styles.selectedColor : "#DCDFE6";
            }
            for (const i in styles) {
                classles += `${i}:${styles[i]};`;
            }

            return classles;
        },
    },
};
</script>

<template>
    <view class="uni-data-checklist" :style="{ 'margin-top': isTop + 'px' }">
        <template v-if="!isLocal">
            <view class="uni-data-loading">
                <uni-load-more
                    v-if="!mixinDatacomErrorMessage"
                    status="loading"
                    iconType="snow"
                    :iconSize="18"
                    :content-text="contentText"
                ></uni-load-more>
                <text v-else>{{ mixinDatacomErrorMessage }}</text>
            </view>
        </template>
        <template v-else>
            <checkbox-group
                v-if="multiple"
                class="checklist-group"
                :class="{ 'is-list': mode === 'list' || wrap }"
                @change="change"
            >
                <label
                    class="checklist-box"
                    :class="[
                        'is--' + mode,
                        item.selected ? 'is-checked' : '',
                        disabled || !!item.disabled ? 'is-disable' : '',
                        index !== 0 && mode === 'list' ? 'is-list-border' : '',
                    ]"
                    :style="item.styleBackgroud"
                    v-for="(item, index) in dataList"
                    :key="index"
                >
                    <checkbox
                        class="hidden"
                        hidden
                        :disabled="disabled || !!item.disabled"
                        :value="item[map.value] + ''"
                        :checked="item.selected"
                    />
                    <view
                        v-if="
                            (mode !== 'tag' && mode !== 'list') ||
                            (mode === 'list' && icon === 'left')
                        "
                        class="checkbox__inner"
                        :style="item.styleIcon"
                    >
                        <view class="checkbox__inner-icon"></view>
                    </view>
                    <view
                        class="checklist-content"
                        :class="{ 'list-content': mode === 'list' && icon === 'left' }"
                    >
                        <text class="checklist-text" :style="item.styleIconText">{{
                            item[map.text]
                        }}</text>
                        <view
                            v-if="mode === 'list' && icon === 'right'"
                            class="checkobx__list"
                            :style="item.styleBackgroud"
                        ></view>
                    </view>
                </label>
            </checkbox-group>
            <radio-group
                v-else
                class="checklist-group"
                :class="{ 'is-list': mode === 'list', 'is-wrap': wrap }"
                @change="change"
            >
                <label
                    class="checklist-box"
                    :class="[
                        'is--' + mode,
                        item.selected ? 'is-checked' : '',
                        disabled || !!item.disabled ? 'is-disable' : '',
                        index !== 0 && mode === 'list' ? 'is-list-border' : '',
                    ]"
                    :style="item.styleBackgroud"
                    v-for="(item, index) in dataList"
                    :key="index"
                >
                    <radio
                        class="hidden"
                        hidden
                        :disabled="disabled || item.disabled"
                        :value="item[map.value] + ''"
                        :checked="item.selected"
                    />
                    <view
                        v-if="
                            (mode !== 'tag' && mode !== 'list') ||
                            (mode === 'list' && icon === 'left')
                        "
                        class="radio__inner"
                        :style="item.styleBackgroud"
                    >
                        <view class="radio__inner-icon" :style="item.styleIcon"></view>
                    </view>
                    <view
                        class="checklist-content"
                        :class="{ 'list-content': mode === 'list' && icon === 'left' }"
                    >
                        <text class="checklist-text" :style="item.styleIconText">{{
                            item[map.text]
                        }}</text>
                        <view
                            v-if="mode === 'list' && icon === 'right'"
                            :style="item.styleRightIcon"
                            class="checkobx__list"
                        ></view>
                    </view>
                </label>
            </radio-group>
        </template>
    </view>
</template>

<style>
.uni-data-loading {
    /* #ifndef APP-NVUE */
    display: flex;
    /* #endif */
    flex-direction: row;
    justify-content: center;
    align-items: center;
    height: 36px;
    padding-left: 10px;
    color: var(--muted-foreground);
}

.uni-data-checklist {
    position: relative;
    z-index: 0;
    flex: 1;
}

/* 多选样式 */
.uni-data-checklist .checklist-group {
    /* #ifndef APP-NVUE */
    display: flex;
    /* #endif */
    flex-direction: row;
    flex-wrap: wrap;
}

.uni-data-checklist .checklist-group.is-list {
    flex-direction: column;
}

.uni-data-checklist .checklist-group .checklist-box {
    /* #ifndef APP-NVUE */
    display: flex;
    /* #endif */
    flex-direction: row;
    align-items: center;
    position: relative;
    margin: 5px 0;
    margin-right: 25px;
}

.uni-data-checklist .checklist-group .checklist-box .hidden {
    position: absolute;
    opacity: 0;
}

/* 文字样式 */
.uni-data-checklist .checklist-group .checklist-box .checklist-content {
    /* #ifndef APP-NVUE */
    display: flex;
    /* #endif */
    flex: 1;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
}

.uni-data-checklist .checklist-group .checklist-box .checklist-content .checklist-text {
    font-size: 14px;
    color: var(--muted-foreground);
    margin-left: 5px;
    line-height: 14px;
}

.uni-data-checklist .checklist-group .checklist-box .checklist-content .checkobx__list {
    border-right-width: 1px;
    border-right-color: var(--primary-500);
    border-right-style: solid;
    border-bottom-width: 1px;
    border-bottom-color: var(--primary-500);
    border-bottom-style: solid;
    height: 12px;
    width: 6px;
    left: -5px;
    transform-origin: center;
    transform: rotate(45deg);
    opacity: 0;
}

/* 多选样式 */
.uni-data-checklist .checklist-group .checklist-box .checkbox__inner {
    /* #ifndef APP-NVUE */
    flex-shrink: 0;
    box-sizing: border-box;
    /* #endif */
    position: relative;
    width: 16px;
    height: 16px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background-color: #fff;
    z-index: 1;
}

.uni-data-checklist .checklist-group .checklist-box .checkbox__inner .checkbox__inner-icon {
    position: absolute;
    /* #ifdef APP-NVUE */
    top: 2px;
    /* #endif */
    /* #ifndef APP-NVUE */
    top: 1px;
    /* #endif */
    left: 5px;
    height: 8px;
    width: 4px;
    border-right-width: 1px;
    border-right-color: #fff;
    border-right-style: solid;
    border-bottom-width: 1px;
    border-bottom-color: #fff;
    border-bottom-style: solid;
    opacity: 0;
    transform-origin: center;
    transform: rotate(40deg);
}

/* 单选样式 */
.uni-data-checklist .checklist-group .checklist-box .radio__inner {
    /* #ifndef APP-NVUE */
    display: flex;
    flex-shrink: 0;
    box-sizing: border-box;
    /* #endif */
    justify-content: center;
    align-items: center;
    position: relative;
    width: 16px;
    height: 16px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background-color: #fff;
    z-index: 1;
}

.uni-data-checklist .checklist-group .checklist-box .radio__inner .radio__inner-icon {
    width: 8px;
    height: 8px;
    border-radius: 10px;
    opacity: 0;
}

/* 默认样式 */
.uni-data-checklist .checklist-group .checklist-box.is--default.is-disable {
    /* #ifdef H5 */
    cursor: not-allowed;
    /* #endif */
}

.uni-data-checklist .checklist-group .checklist-box.is--default.is-disable .checkbox__inner {
    background-color: var(--muted);
    border-color: var(--border);
    /* #ifdef H5 */
    cursor: not-allowed;
    /* #endif */
}

.uni-data-checklist .checklist-group .checklist-box.is--default.is-disable .radio__inner {
    background-color: var(--muted);
    border-color: var(--border);
}

.uni-data-checklist .checklist-group .checklist-box.is--default.is-disable .checklist-text {
    color: var(--muted-foreground);
}

/* 选中 */
.uni-data-checklist .checklist-group .checklist-box.is--default.is-checked .checkbox__inner {
    border-color: var(--primary-500);
    background-color: var(--primary-500);
}

.uni-data-checklist
    .checklist-group
    .checklist-box.is--default.is-checked
    .checkbox__inner
    .checkbox__inner-icon {
    opacity: 1;
    transform: rotate(45deg);
}

.uni-data-checklist .checklist-group .checklist-box.is--default.is-checked .radio__inner {
    border-color: var(--primary-500);
}

.uni-data-checklist
    .checklist-group
    .checklist-box.is--default.is-checked
    .radio__inner
    .radio__inner-icon {
    opacity: 1;
    background-color: var(--primary-500);
}

.uni-data-checklist .checklist-group .checklist-box.is--default.is-checked .checklist-text {
    color: var(--primary-500);
}

/* 选中禁用 */
.uni-data-checklist
    .checklist-group
    .checklist-box.is--default.is-checked.is-disable
    .checkbox__inner {
    opacity: 0.4;
}

.uni-data-checklist
    .checklist-group
    .checklist-box.is--default.is-checked.is-disable
    .checklist-text {
    opacity: 0.4;
}

.uni-data-checklist
    .checklist-group
    .checklist-box.is--default.is-checked.is-disable
    .radio__inner {
    opacity: 0.4;
}

/* 按钮样式 */
.uni-data-checklist .checklist-group .checklist-box.is--button {
    margin-right: 10px;
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: 3px;
    transition: border-color 0.2s;
}

/* 禁用 */
.uni-data-checklist .checklist-group .checklist-box.is--button.is-disable {
    /* #ifdef H5 */
    cursor: not-allowed;
    /* #endif */
    border: 1px solid var(--border);
    opacity: 0.4;
}

.uni-data-checklist .checklist-group .checklist-box.is--button.is-disable .checkbox__inner {
    background-color: var(--muted);
    border-color: var(--border);
    /* #ifdef H5 */
    cursor: not-allowed;
    /* #endif */
}

.uni-data-checklist .checklist-group .checklist-box.is--button.is-disable .radio__inner {
    background-color: var(--muted);
    border-color: var(--border);
    /* #ifdef H5 */
    cursor: not-allowed;
    /* #endif */
}

.uni-data-checklist .checklist-group .checklist-box.is--button.is-disable .checklist-text {
    color: var(--muted-foreground);
}

.uni-data-checklist .checklist-group .checklist-box.is--button.is-checked {
    border-color: var(--primary-500);
}

.uni-data-checklist .checklist-group .checklist-box.is--button.is-checked .checkbox__inner {
    border-color: var(--primary-500);
    background-color: var(--primary-500);
}

.uni-data-checklist
    .checklist-group
    .checklist-box.is--button.is-checked
    .checkbox__inner
    .checkbox__inner-icon {
    opacity: 1;
    transform: rotate(45deg);
}

.uni-data-checklist .checklist-group .checklist-box.is--button.is-checked .radio__inner {
    border-color: var(--primary-500);
}

.uni-data-checklist
    .checklist-group
    .checklist-box.is--button.is-checked
    .radio__inner
    .radio__inner-icon {
    opacity: 1;
    background-color: var(--primary-500);
}

.uni-data-checklist .checklist-group .checklist-box.is--button.is-checked .checklist-text {
    color: var(--primary-500);
}

/* 选中禁用 */
.uni-data-checklist .checklist-group .checklist-box.is--button.is-checked.is-disable {
    opacity: 0.4;
}

/* 标签样式 */
.uni-data-checklist .checklist-group .checklist-box.is--tag {
    margin-right: 10px;
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background-color: var(--muted);
}

.uni-data-checklist .checklist-group .checklist-box.is--tag .checklist-text {
    margin: 0;
    color: var(--muted-foreground);
}

/* 禁用 */
.uni-data-checklist .checklist-group .checklist-box.is--tag.is-disable {
    /* #ifdef H5 */
    cursor: not-allowed;
    /* #endif */
    opacity: 0.4;
}

.uni-data-checklist .checklist-group .checklist-box.is--tag.is-checked {
    background-color: var(--primary-500);
    border-color: var(--primary-500);
}

.uni-data-checklist .checklist-group .checklist-box.is--tag.is-checked .checklist-text {
    color: #fff;
}

/* 列表样式 */
.uni-data-checklist .checklist-group .checklist-box.is--list {
    /* #ifndef APP-NVUE */
    display: flex;
    /* #endif */
    padding: 10px 15px;
    padding-left: 0;
    margin: 0;
}

.uni-data-checklist .checklist-group .checklist-box.is--list.is-list-border {
    border-top: 1px solid var(--border);
}

/* 禁用 */
.uni-data-checklist .checklist-group .checklist-box.is--list.is-disable {
    /* #ifdef H5 */
    cursor: not-allowed;
    /* #endif */
}

.uni-data-checklist .checklist-group .checklist-box.is--list.is-disable .checkbox__inner {
    background-color: var(--muted);
    border-color: var(--border);
    /* #ifdef H5 */
    cursor: not-allowed;
    /* #endif */
}

.uni-data-checklist .checklist-group .checklist-box.is--list.is-disable .checklist-text {
    color: var(--muted-foreground);
}

.uni-data-checklist .checklist-group .checklist-box.is--list.is-checked .checkbox__inner {
    border-color: var(--primary-500);
    background-color: var(--primary-500);
}

.uni-data-checklist
    .checklist-group
    .checklist-box.is--list.is-checked
    .checkbox__inner
    .checkbox__inner-icon {
    opacity: 1;
    transform: rotate(45deg);
}

.uni-data-checklist .checklist-group .checklist-box.is--list.is-checked .radio__inner {
    border-color: var(--primary-500);
}

.uni-data-checklist
    .checklist-group
    .checklist-box.is--list.is-checked
    .radio__inner
    .radio__inner-icon {
    opacity: 1;
    background-color: var(--primary-500);
}

.uni-data-checklist .checklist-group .checklist-box.is--list.is-checked .checklist-text {
    color: var(--primary-500);
}

.uni-data-checklist
    .checklist-group
    .checklist-box.is--list.is-checked
    .checklist-content
    .checkobx__list {
    opacity: 1;
    border-color: var(--primary-500);
}

/* 选中禁用 */
.uni-data-checklist
    .checklist-group
    .checklist-box.is--list.is-checked.is-disable
    .checkbox__inner {
    opacity: 0.4;
}

.uni-data-checklist .checklist-group .checklist-box.is--list.is-checked.is-disable .checklist-text {
    opacity: 0.4;
}
</style>
