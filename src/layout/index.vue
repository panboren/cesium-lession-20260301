<template>
  <div class="app-wrapper">
    <Sidebar v-if="isSidebar" />
    <div class="main-container">
      <Header />
      <AppMain>
        <template #default="{ Component, route }">
          <transition name="fade-transform" mode="out-in">
            <keep-alive :include="cachedViews">
              <component :is="Component" :key="route.path" />
            </keep-alive>
          </transition>
        </template>
      </AppMain>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/store/modules/app'
import { useTagsViewStore } from '@/store/modules/tagsView'
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'
import AppMain from './components/AppMain.vue'

const appStore = useAppStore()
const tagsViewStore = useTagsViewStore()

const isSidebar = computed(() => appStore.getLayout !== 'top')
const cachedViews = computed(() => tagsViewStore.cachedViews)
</script>

<style scoped lang="scss">
.app-wrapper {
  width: 100%;
  height: 100vh;
  display: flex;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.3s ease;
}

.fade-transform-enter {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>


