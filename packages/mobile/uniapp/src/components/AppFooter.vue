<script lang="ts" setup>
function handleClickGithub() {
  if (window?.open) {
    window.open('https://github.com/uni-helper/vitesse-uni-app')
  }
  else {
    uni.showToast({
      icon: 'none',
      title: '请使用浏览器打开',
    })
  }
}
</script>

<template>
  <view text="xl gray4" m-5 flex items-center justify-center gap-3>
    <navigator url="/pages/index" open-type="redirect">
      <view i-carbon-campsite />
    </navigator>

    <view cursor-pointer @click="handleClickGithub">
      <view i-carbon:logo-github />
    </view>
  </view>
</template>
