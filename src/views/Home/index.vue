<template>
  <div class="home">
    <el-card>
      <template #header>
        <span>欢迎使用 MyAdmin 管理系统</span>
      </template>
      <el-row :gutter="20">
        <el-col :span="6">
          <el-statistic title="用户总数" :value="1234" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="文章数量" :value="567" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="访问量" :value="8901" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="今日访问" :value="234" />
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <span>最近活动</span>
      </template>
      <el-table :data="tableData" style="width: 100%">
        <el-table-column prop="date" label="日期" width="180" />
        <el-table-column prop="name" label="用户" width="180" />
        <el-table-column prop="action" label="操作" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([
  {
    date: '2024-01-15',
    name: '张三',
    action: '登录系统'
  },
  {
    date: '2024-01-15',
    name: '李四',
    action: '创建文章'
  },
  {
    date: '2024-01-15',
    name: '王五',
    action: '更新用户信息'
  }
])
</script>

<style scoped lang="scss">
.home {
  width: 100%;
  height: 100%;
  padding: 20px;
  overflow-y: auto;
  box-sizing: border-box;
}
</style>

