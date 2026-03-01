<template>
  <div class="sidebar-container">
    <div v-if="!isCollapse" class="logo-container">
      <Logo />
    </div>
    <el-scrollbar>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :unique-opened="true"
        router
      >
        <SidebarItem
          v-for="route in routes"
          :key="route.path"
          :item="route"
        />
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/store/modules/app'
import { usePermissionStoreWithOut } from '@/store/modules/permission'
import SidebarItem from './SidebarItem.vue'
import Logo from './Logo.vue'

const route = useRoute()
const appStore = useAppStore()
const permissionStore = usePermissionStoreWithOut()

const activeMenu = computed(() => route.path)

// 静态首页 + 动态路由
const routes = computed(() => {
  // 首页
  const homeRoute = {
    path: '/index',
    name: 'Index',
    meta: {
      title: '首页',
      icon: 'HomeFilled'
    }
  }

  // 从 permissionStore 获取动态路由
  const dynamicRoutes = permissionStore.getRouters

  return [homeRoute, ...dynamicRoutes]
})

const isCollapse = computed(() => !appStore.getLogo)
</script>

<style scoped lang="scss">
.sidebar-container {
  width: 210px;
  height: 100vh;
  background-color: #001529;
  transition: width 0.28s;

  .logo-container {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 18px;
    font-weight: bold;
  }

  .el-menu {
    border-right: none;
  }

  :deep(.el-menu-item) {
    color: #bfcbd9;
    background-color: #001529;

    &:hover {
      background-color: #263445;
    }

    &.is-active {
      background-color: #409eff;
      color: #fff;
    }
  }

  :deep(.el-sub-menu__title) {
    color: #bfcbd9;

    &:hover {
      background-color: #263445;
    }
  }
}
</style>
