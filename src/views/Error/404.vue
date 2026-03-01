<template>
  <div class="error-page">
    <div class="error-content">
      <h1>404</h1>
      <p>页面不存在</p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style scoped lang="scss">
.error-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;

  .error-content {
    text-align: center;

    h1 {
      font-size: 120px;
      color: #409eff;
      margin: 0;
    }

    p {
      font-size: 24px;
      color: #666;
      margin: 20px 0;
    }
  }
}
</style>
