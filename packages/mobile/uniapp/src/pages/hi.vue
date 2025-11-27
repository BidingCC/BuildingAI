<script lang="ts" setup>
definePage({
  layout: 'home',
})

const { value: name } = useQuery('name')
</script>

<template>
  <view>{{ name }}</view>

  <HiCounter />
</template>
