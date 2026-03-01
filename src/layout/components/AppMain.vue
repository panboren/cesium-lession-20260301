<template>
  <div class="app-main">
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.app-main {
  flex: 1;
  padding: 20px;
  overflow: auto;
  background-color: #f0f2f5;
}

.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s ease;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>

