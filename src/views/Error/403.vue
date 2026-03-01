<template>
  <div class="error-container">
    <div class="error-content">
      <h1 class="error-code">403</h1>
      <h2 class="error-title">抱歉，您没有权限访问该页面</h2>
      <el-button type="primary" @click="goBack">返回上一页</el-button>
      <el-button @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}

const goHome = () => {
  router.push('/')
}
</script>

<style scoped lang="scss">
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;

  .error-content {
    text-align: center;

    .error-code {
      font-size: 120px;
      font-weight: bold;
      color: #409eff;
      margin: 0 0 20px;
    }

    .error-title {
      font-size: 24px;
      color: #333;
      margin: 0 0 40px;
    }

    .el-button {
      margin: 0 10px;
    }
  }
}
</style>
