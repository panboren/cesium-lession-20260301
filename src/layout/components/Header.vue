<template>
  <div class="app-header">
    <Logo v-if="appStore.getLogo" />
    <Breadcrumb v-if="appStore.getBreadcrumb" />
    <div class="right-menu">
      <ThemeSwitch />
      <Screenfull />
      <UserDropdown />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/store/modules/app'
import Logo from './Logo.vue'
import Breadcrumb from './Breadcrumb.vue'
import ThemeSwitch from './ThemeSwitch.vue'
import Screenfull from './Screenfull.vue'
import UserDropdown from './UserDropdown.vue'

const appStore = useAppStore()
</script>

<style scoped lang="scss">
.app-header {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--app-header-bg-color, #fff);

  .right-menu {
    display: flex;
    align-items: center;
    gap: 16px;
  }
}
</style>
