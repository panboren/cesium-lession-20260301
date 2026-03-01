<template>
  <div class="avatar-container">
    <el-avatar :size="32" />
    <span class="username">Admin</span>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.avatar-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  .username {
    font-size: 14px;
  }
}
</style>
