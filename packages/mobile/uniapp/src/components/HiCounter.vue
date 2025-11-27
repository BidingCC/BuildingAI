<script setup lang="ts">
const { count, inc, dec } = useCount()
</script>

<template>
  <view inline-flex m="y-3">
    <view class="btn" @click="dec()">
      <text i-carbon-subtract />
    </view>
    <view font="mono" w="15" m-auto inline-block>
      {{ count }}
    </view>
    <view class="btn" @click="inc()">
      <text i-carbon-add />
    </view>
  </view>
</template>

<style>
.btn {
  --at-apply: w-8 h-8 flex items-center justify-center rounded-full bg-teal-600 text-white cursor-pointer;
}
</style>
