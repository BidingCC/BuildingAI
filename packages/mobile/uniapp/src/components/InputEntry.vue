<script setup lang="ts">
const name = ref('')
function go() {
  if (name.value) {
    uni.navigateTo({
      url: `/pages/hi?name=${name.value}`,
    })
  }
}
</script>

<template>
  <view>
    <view
      p="x-4 y-2"
      w="250px"
      m="t-5 auto"
      text="center"
      bg="transparent"
      border="~ rounded gray-200 dark:gray-700 solid"
      outline="none active:none"
      box-border
      w-full
    >
      <input
        v-model="name"
        placeholder="What's your name?"
        type="text"
        autocomplete="off"
        mr-0
        w-full
      >
    </view>
    <view>
      <button
        :disabled="!name"
        m="t-3 auto"
        m-auto
        w-120rpx
        rounded
        bg-teal-600
        px-4
        py-1
        text-sm
        text-white
        hover-class="bg-teal-700"
        @click="go"
      >
        GO
      </button>
    </view>
  </view>
</template>
