<script setup lang="ts">
import type { UniPopupInstance } from "@uni-helper/uni-ui-types";

definePage({
    style: {
        navigationBarTitle: "pages.demo",
    },
});

// 动作面板实例
const actionSheetRef = ref<UniPopupInstance>();
// picker实例
const pickerRef = ref<UniPopupInstance>();
// modal实例
const modalRef = ref<UniPopupInstance>();

const range2 = [
    { value: 0, text: "篮球" },
    { value: 1, text: "足球" },
    { value: 2, text: "游泳" },
    { value: 3, text: "跳绳" },
    { value: 4, text: "摸鱼" },
    { value: 5, text: "跑步" },
];

const range3 = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
];

const req = () => {
    console.log("req");
};

const download = () => {
    console.log("download");
};

const modal = () => {
    uni.showModal({
        title: "提示",
        content: "这是一段内容",
        success: (res) => {
            console.log(res);
        },
    });
};
</script>

<template>
    <view p="4" space="y-sm">
        <view flex="~ col">
            <text mb-1> 主题色 </text>

            <view grid="~ cols-3 gap-2">
                <button type="primary">主色</button>
                <button type="warn">警告色</button>
                <button type="default">默认色</button>
                <button type="success">成功色</button>
                <button type="info">信息色</button>
                <button type="error">错误色</button>
            </view>
        </view>

        <view flex="~ col">
            <text mb-2> 动作面板（action-sheet） </text>

            <button type="default" @click="actionSheetRef?.open()">打开动作面板</button>
            <bd-action-sheet
                ref="actionSheetRef"
                :actions="[
                    {
                        title: '无颜色',
                        click: () => {
                            console.log('click');
                        },
                    },
                    {
                        title: '点击回调操作',
                        type: 'primary',
                        click: () => {
                            console.log('click');
                        },
                    },
                    {
                        title: '删除',
                        desc: '一段描述文字',
                        type: 'error',
                        click: () => {
                            console.log('点击删除了');
                            useToast('删除了');
                        },
                    },
                ]"
            />
        </view>

        <view flex="~ col">
            <text mb-1> 选择器（picker） </text>

            <view flex="~ items-center" gap="2">
                <view w-full>
                    <picker :value="0" :range="range2" range-key="text" mode="date">
                        <button type="default">原生picker</button>
                    </picker>
                </view>
                <button type="default" @click="pickerRef?.open()">自定义picker</button>
            </view>
            <bd-picker ref="pickerRef" :range="range3" :value="[0, 0, 1]" />
        </view>

        <view flex="~ col">
            <text mb-1> 模态框（modal） </text>

            <view flex="~ items-center" gap="2">
                <button type="default" @click="modal()">原生模态框</button>
                <button type="default" @click="modalRef?.open()">打开模态框</button>
            </view>
            <bd-modal ref="modalRef" title="提示" content="这是一段内容" />
        </view>
    </view>
</template>
