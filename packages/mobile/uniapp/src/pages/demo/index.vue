<script setup lang="ts">
import type {
    UniCountdownInstance,
    UniFormsInstance,
    UniPopupInstance,
} from "@uni-helper/uni-ui-types";

import BdActionSheet from "@/components/bd-action-sheet.vue";
import BdModal from "@/components/bd-modal.vue";
import BdPicker from "@/components/bd-picker.vue";

definePage({
    style: {
        navigationBarTitle: "pages.demo",
        auth: false,
    },
});

// 动作面板实例
const actionSheetRef = ref<UniPopupInstance>();
// picker实例
const pickerRef = ref<UniPopupInstance>();
// modal实例
const modalRef = ref<UniPopupInstance>();
// countdown实例
const countdownRef = ref<UniCountdownInstance>();
// 表单实例
const customFormRefs = ref<UniFormsInstance>();

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

const formData = reactive({
    name: "",
    age: "",
    hobby: [],
});

const customRules = {
    name: {
        rules: [
            {
                required: true,
                errorMessage: "姓名不能为空",
            },
        ],
    },
    age: {
        rules: [
            {
                required: true,
                errorMessage: "年龄不能为空",
            },
        ],
    },
    hobby: {
        rules: [
            {
                format: "array",
            },
            {
                validateFunction: function (rule, value, data, callback) {
                    if (value.length < 2) {
                        callback("请至少勾选两个兴趣爱好");
                    }
                    return true;
                },
            },
        ],
    },
};

const upload = async () => {
    try {
        const res = await new Promise<UniApp.ChooseImageSuccessCallbackResult>(
            (resolve, reject) => {
                uni.chooseImage({
                    count: 1,
                    success: resolve,
                    fail: reject,
                });
            },
        );

        const tempFilePath = res.tempFilePaths[0];

        const uploadTask = useUpload({
            data: {
                file: tempFilePath,
            },
            success: (uploadRes) => {
                console.log("Upload success:", uploadRes);
                useToast().success("上传成功");
            },
            fail: (errMsg) => {
                console.error("Upload failed:", errMsg);
                useToast().error(`上传失败: ${errMsg}`);
            },
            complete: () => {
                console.log("Upload complete");
            },
        });

        uploadTask.onProgressUpdate((progressRes) => {
            console.log("Upload progress:", progressRes.progress);
            console.log("Total bytes:", progressRes.totalBytesExpectedToSend);
            console.log("Sent bytes:", progressRes.totalBytesSent);
        });
    } catch (err) {
        console.error("Choose image failed:", err);
        useToast().error("选择图片失败");
    }
};

const download = () => {
    const imageUrl =
        "https://profile-avatar.csdnimg.cn/4fbb4d040cdc4343a243b0c235ea195e_weixin_45121448.jpg!1";

    useDownloadFile({
        type: "image",
        fileUrl: imageUrl,
        success: (res) => {
            console.log("Download success:", res);
        },
        fail: (errMsg) => {
            console.error("Download failed:", errMsg);
            useToast().error(`${errMsg}`);
        },
        complete: () => {
            console.log("Download complete");
        },
    });
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

const timeup = () => {
    countdownRef.value?.startData();
    // useToast().success("倒计时结束，已回调");
};

const submit = async () => {
    try {
        await customFormRefs.value?.validate();
        useToast().success("表单校验通过");
    } catch (error) {
        console.log(error);
    }
};
</script>

<template>
    <view p="4" space="y-sm">
        <view flex="~ col">
            <text mb-1> 主题色 primary </text>

            <view flex="~ col" gap="2">
                <view>
                    <view flex>
                        <view class="bg-primary w-full text-center"></view>
                        <view class="bg-primary-50 w-full text-center"> 50</view>
                        <view class="bg-primary-100 w-full text-center"> 100</view>
                        <view class="bg-primary-200 w-full text-center"> 200</view>
                        <view class="bg-primary-300 w-full text-center"> 300</view>
                        <view class="bg-primary-400 w-full text-center"> 400</view>
                        <view class="bg-primary-500 w-full text-center"> 500</view>
                        <view class="bg-primary-600 w-full text-center"> 600</view>
                        <view class="bg-primary-700 w-full text-center"> 700</view>
                        <view class="bg-primary-800 w-full text-center"> 800</view>
                        <view class="bg-primary-900 w-full text-center"> 900</view>
                    </view>
                </view>
                <view>
                    <view text-xs>警告色 warning</view>
                    <view flex>
                        <view class="bg-warning w-full text-center"></view>
                        <view class="bg-warning-50 w-full text-center"> 50</view>
                        <view class="bg-warning-100 w-full text-center"> 100</view>
                        <view class="bg-warning-200 w-full text-center"> 200</view>
                        <view class="bg-warning-300 w-full text-center"> 300</view>
                        <view class="bg-warning-400 w-full text-center"> 400</view>
                        <view class="bg-warning-500 w-full text-center"> 500</view>
                        <view class="bg-warning-600 w-full text-center"> 600 </view>
                        <view class="bg-warning-700 w-full text-center"> 700</view>
                        <view class="bg-warning-800 w-full text-center"> 800</view>
                        <view class="bg-warning-900 w-full text-center"> 900</view>
                    </view>
                </view>
                <view>
                    <view text-xs>成功色 success</view>
                    <view flex>
                        <view class="bg-success w-full text-center"></view>
                        <view class="bg-success-50 w-full text-center"> 50</view>
                        <view class="bg-success-100 w-full text-center"> 100</view>
                        <view class="bg-success-200 w-full text-center"> 200</view>
                        <view class="bg-success-300 w-full text-center"> 300</view>
                        <view class="bg-success-400 w-full text-center"> 400</view>
                        <view class="bg-success-500 w-full text-center"> 500</view>
                        <view class="bg-success-600 w-full text-center"> 600</view>
                        <view class="bg-success-700 w-full text-center"> 700</view>
                        <view class="bg-success-800 w-full text-center"> 800</view>
                        <view class="bg-success-900 w-full text-center"> 900</view>
                    </view>
                </view>
                <view>
                    <view text-xs>信息色 info</view>
                    <view flex>
                        <view class="bg-info w-full text-center"></view>
                        <view class="bg-info-50 w-full text-center"></view>
                        <view class="bg-info-100 w-full text-center"> 100</view>
                        <view class="bg-info-200 w-full text-center"> 200</view>
                        <view class="bg-info-300 w-full text-center"> 300</view>
                        <view class="bg-info-400 w-full text-center"> 400</view>
                        <view class="bg-info-500 w-full text-center"> 500</view>
                        <view class="bg-info-600 w-full text-center"> 600</view>
                        <view class="bg-info-700 w-full text-center"> 700</view>
                        <view class="bg-info-800 w-full text-center"> 800</view>
                        <view class="bg-info-900 w-full text-center"> 900</view>
                    </view>
                </view>
                <view>
                    <view text-xs>错误色 error</view>
                    <view flex>
                        <view class="bg-error w-full text-center"></view>
                        <view class="bg-error-50 w-full text-center"> 50</view>
                        <view class="bg-error-100 w-full text-center"> 100</view>
                        <view class="bg-error-200 w-full text-center"> 200</view>
                        <view class="bg-error-300 w-full text-center"> 300</view>
                        <view class="bg-error-400 w-full text-center"> 400</view>
                        <view class="bg-error-500 w-full text-center"> 500</view>
                        <view class="bg-error-600 w-full text-center"> 600</view>
                        <view class="bg-error-700 w-full text-center"> 700</view>
                        <view class="bg-error-800 w-full text-center"> 800</view>
                        <view class="bg-error-900 w-full text-center"> 900</view>
                    </view>
                </view>
                <view>
                    <view text-xs>中性色</view>
                    <view flex>
                        <view class="bg-neutral w-full text-center"></view>
                        <view class="w-full bg-neutral-50 text-center"> 50</view>
                        <view class="w-full bg-neutral-100 text-center"> 100</view>
                        <view class="w-full bg-neutral-200 text-center"> 200</view>
                        <view class="w-full bg-neutral-300 text-center"> 300</view>
                        <view class="w-full bg-neutral-400 text-center"> 400</view>
                        <view class="w-full bg-neutral-500 text-center"> 500</view>
                        <view class="w-full bg-neutral-600 text-center"> 600</view>
                        <view class="w-full bg-neutral-700 text-center"> 700</view>
                        <view class="w-full bg-neutral-800 text-center"> 800</view>
                        <view class="w-full bg-neutral-900 text-center"> 900</view>
                    </view>
                </view>
            </view>
        </view>

        <view flex="~ col">
            <text mb-1> 网络请求 </text>

            <view flex gap="2">
                <button type="default" @click="upload()">文件上传</button>
                <button type="default" @click="download()">文件下载</button>
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

        <view flex="~ col">
            <text mb-1> 按钮 </text>

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
            <text mb-1> 镂空按钮 </text>

            <view grid="~ cols-3 gap-2">
                <button type="primary" plain>主色</button>
                <button type="success" plain>成功色</button>
                <button type="error" plain>错误色</button>
            </view>
        </view>

        <view flex="~ col">
            <text mb-1> 加载按钮 </text>

            <view grid="~ cols-3 gap-2">
                <button type="primary" loading>主色</button>
                <button type="success" loading>成功色</button>
                <button type="error" loading>错误色</button>
            </view>
        </view>
        <view flex="~ col">
            <text mb-1> 图标按钮 </text>

            <view grid="~ cols-3 gap-2">
                <button type="primary" font="bold">
                    <view i-lucide-boxes />
                    主色
                </button>
                <button type="success" font="bold">
                    <view i-lucide-sparkles />
                    成功色
                </button>
                <button type="error" font="bold">
                    <view i-lucide-qr-code />
                    错误色
                </button>
            </view>
        </view>

        <view flex="~ col">
            <text mb-1> 加强输入框（uni-easyinput） </text>
            <uni-easyinput placeholder="请输入内容" type="password" />
        </view>

        <view flex="~ col">
            <text mb-1> 倒计时按钮（uni-count-down </text>
            <view flex="~ items-center" gap="2">
                <view text-xs>一般用法</view>
                <uni-countdown :day="1" :hour="1" :minute="12" :second="40" />
            </view>
            <view flex="~ items-center" gap="2">
                <view text-xs>不显示天数</view>
                <uni-countdown :show-day="false" :day="1" :hour="1" :minute="12" :second="40" />
            </view>
            <view flex="~ items-center" gap="2">
                <view text-xs>自定义颜色</view>
                <uni-countdown
                    :day="1"
                    :hour="2"
                    :minute="30"
                    :second="0"
                    color="var(--background)"
                    background-color="var(--primary)"
                />
            </view>
            <view flex="~ items-center" gap="2">
                <view text-xs>倒计时结束回调</view>
                <uni-countdown
                    ref="countdownRef"
                    :show-day="false"
                    :show-hour="false"
                    :show-minute="false"
                    :second="10"
                    @timeup="timeup"
                />
            </view>
        </view>

        <view flex="~ col" gap="2">
            <text mb-1> 数字角标（uni-badge） </text>
            <view flex="~ items-center" gap="2">
                <view text-xs>基础用法</view>
                <uni-badge class="uni-badge-left-margin" :text="1" />
                <uni-badge class="uni-badge-left-margin" :text="2" type="primary" />
                <uni-badge class="uni-badge-left-margin" :text="34" type="success" />
                <uni-badge class="uni-badge-left-margin" :text="45" type="warning" />
                <uni-badge class="uni-badge-left-margin" :text="123" type="info" />
            </view>
            <view flex="~ items-center" gap="2">
                <view text-xs>无底色</view>
                <uni-badge class="uni-badge-left-margin" :inverted="true" :text="1" />
                <uni-badge
                    class="uni-badge-left-margin"
                    :inverted="true"
                    :text="2"
                    type="primary"
                />

                <uni-badge
                    class="uni-badge-left-margin"
                    :inverted="true"
                    :text="34"
                    type="success"
                />

                <uni-badge
                    class="uni-badge-left-margin"
                    :inverted="true"
                    :text="45"
                    type="warning"
                />

                <uni-badge class="uni-badge-left-margin" :inverted="true" :text="123" type="info" />
            </view>
            <view flex="~ items-center" gap="2">
                <view text-xs>offset 偏移</view>
                <uni-badge
                    class="uni-badge-left-margin"
                    :text="8"
                    absolute="rightTop"
                    :offset="[-3, -3]"
                    size="small"
                >
                    <view
                        class="size-6 bg-neutral-500 text-xs"
                        flex="~ items-center"
                        justify="~ center"
                    >
                        <text class="box-text">右上</text>
                    </view>
                </uni-badge>
            </view>
            <view flex="~ items-center" gap="2">
                <view text-xs>仅显示点</view>
                <uni-badge
                    class="uni-badge-left-margin"
                    :text="8"
                    :is-dot="true"
                    absolute="rightTop"
                    :offset="[-3, -3]"
                    size="small"
                >
                    <view
                        class="size-6 bg-neutral-500 text-xs"
                        flex="~ items-center"
                        justify="~ center"
                    >
                        <text class="box-text">右上</text>
                    </view>
                </uni-badge>
            </view>
        </view>

        <view flex="~ col" gap="2">
            <text mb-1> 表单校验（uni-forms） </text>
            <view flex="~ col" gap="2">
                <uni-forms ref="customFormRefs" :rules="customRules" :modelValue="formData">
                    <uni-forms-item label="姓名" required name="name">
                        <uni-easyinput v-model="formData.name" placeholder="请输入姓名" />
                    </uni-forms-item>
                    <uni-forms-item label="年龄" required name="age">
                        <uni-easyinput v-model="formData.age" placeholder="请输入年龄" />
                    </uni-forms-item>
                    <uni-forms-item label="兴趣爱好" label-width="100px" required name="hobby">
                        <uni-data-checkbox
                            v-model="formData.hobby"
                            multiple
                            :localdata="[
                                {
                                    text: '跑步',
                                    value: 0,
                                },
                                {
                                    text: '游泳',
                                    value: 1,
                                },
                                {
                                    text: '绘画',
                                    value: 2,
                                },
                                {
                                    text: '足球',
                                    value: 3,
                                },
                                {
                                    text: '篮球',
                                    value: 4,
                                },
                                {
                                    text: '其他',
                                    value: 5,
                                },
                            ]"
                        />
                    </uni-forms-item>
                </uni-forms>
                <button size="mini" type="primary" @click="submit('customFormRefs')">提交</button>
            </view>
        </view>
    </view>
</template>
