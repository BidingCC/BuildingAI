# half-popup

高性能滑动弹窗组件，是一款轻量级的弹窗组件，使用了wxs高性能的绘制方式，它有和抖音评论区一致的效果。

## 功能

* 可滑动弹窗
* 可扩展全屏弹窗
* 易于定制，提供基础的弹窗配置

## 演示效果
![](https://github.com/ii517/uni-hlaf-popup/blob/main/src/static/e.gif?raw=true)

## 安装
您可以在uni-app插件市场通过uni_modules的形式进行安装，此安装方式可以方便您后续在uni_modules进行一键升级

## 使用
简单使用示例：
```vue
<script setup>
    const show = ref(true)

    const open = () => {
        console.log('开启了')
    }
    const close = () => {
        console.log('关闭了')
    }
</script>

<template>
    <view class="page">
        <button class="title" @click="show = !show">开启</button>
        
        <half-popup v-model="show"  @close="close" @open="open">
            <scroll-view
                :scroll-y="true"
                style="height: 100%"
            >
                <view style="padding: 20rpx" v-for="item in 60">
                    你好呀 {{item }}
                </view>
            </scroll-view>
        </half-popup>
    </view>
</template>
```

## Props for halfPopup

| Prop name      | Type    | Default value | Description   |
|----------------|---------|---------------|---------------|
| v-model        | Boolean | `true`        | 控制弹框是否显示      |
| height         | Number  | 980           | 弹框高度          |
| radius         | Number  | 20            | 弹框的内容的圆角      |
| duration       | Number  | 200           | 动画过渡时间        |
| closeOnOverlay | Boolean | `true`        | 点击overlay关闭弹框 |
| closeBtn       | Boolean | `true`        | 是否显示关闭按钮      |
| fullScreen     | Boolean | `true`        | 是否显示可以充满屏幕按钮  |
| zIndex         | Number  | 9999          | 层级            |
| color          | String  | ''            | 图标颜色              |

### 联系和支持
如有任何疑问或反馈，欢迎创建 GitHub issues 或联系我们（您的联系邮箱）。
