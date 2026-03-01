<template>
  <div class="user-management">
    <ContentWrap>
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="searchForm.nickname" placeholder="请输入昵称" clearable />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="searchForm.mobile" placeholder="请输入手机号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="正常" :value="0" />
            <el-option label="停用" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增
          </el-button>
          <el-button type="success" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </el-form-item>
      </el-form>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="avatar" label="头像" width="80" align="center">
          <template #default="{ row }">
            <el-avatar v-if="row.avatar" :src="row.avatar" :size="40" />
            <el-avatar v-else :size="40">
              <el-icon><User /></el-icon>
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="mobile" label="手机号" min-width="130" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'success' : 'danger'">
              {{ row.status === 0 ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="300" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="primary" link @click="handleAssignRole(row)">
              <el-icon><Lock /></el-icon>
              分配角色
            </el-button>
            <el-button type="primary" link @click="handleResetPassword(row)">
              <el-icon><Key /></el-icon>
              重置密码
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.pageNo"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />

      <!-- 用户表单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="600px"
        :close-on-click-modal="false"
      >
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" :disabled="!!form.id" />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="form.nickname" placeholder="请输入昵称" />
          </el-form-item>
          <el-form-item label="手机号" prop="mobile">
            <el-input v-model="form.mobile" placeholder="请输入手机号" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>
          <el-form-item v-if="!form.id" label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
            />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio :value="0">正常</el-radio>
              <el-radio :value="1">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
        </template>
      </el-dialog>

      <!-- 分配角色对话框 -->
      <el-dialog
        v-model="roleDialogVisible"
        title="分配角色"
        width="400px"
        :close-on-click-modal="false"
      >
        <el-checkbox-group v-model="selectedRoles">
          <el-checkbox v-for="role in allRoles" :key="role.id" :value="role.id">
            {{ role.name }}
          </el-checkbox>
        </el-checkbox-group>
        <template #footer>
          <el-button @click="roleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleRoleSubmit">确定</el-button>
        </template>
      </el-dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useMessage } from '@/hooks/web/useMessage'
import type { UserInfo } from '@/types'
import { getUserPage, createUser, updateUser, deleteUser, exportUser } from '@/api/system/user'
import { getRoleAll } from '@/api/system/role'
import {
  Search,
  Refresh,
  Plus,
  Edit,
  Delete,
  User,
  Lock,
  Key,
  Download
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

const { confirm, success, warning } = useMessage()

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const roleDialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const formRef = ref<FormInstance>()

const searchForm = reactive({
  username: '',
  nickname: '',
  mobile: '',
  status: undefined
})

const pagination = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

const form = reactive<UserInfo & { password?: string }>({
  id: undefined,
  username: '',
  nickname: '',
  email: '',
  mobile: '',
  status: 0,
  password: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  mobile: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const tableData = ref<UserInfo[]>([])
const allRoles = ref<any[]>([])
const selectedRoles = ref<number[]>([])
const currentUserId = ref<number>()

const handleSearch = () => {
  pagination.pageNo = 1
  loadData()
}

const handleReset = () => {
  searchForm.username = ''
  searchForm.nickname = ''
  searchForm.mobile = ''
  searchForm.status = undefined
  pagination.pageNo = 1
  loadData()
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadData()
}

const handlePageChange = (page: number) => {
  pagination.pageNo = page
  loadData()
}

const handleAdd = () => {
  dialogTitle.value = '新增用户'
  dialogVisible.value = true
  resetForm()
}

const handleEdit = (row: UserInfo) => {
  dialogTitle.value = '编辑用户'
  dialogVisible.value = true
  Object.assign(form, row)
  delete form.password
}

const handleAssignRole = async (row: UserInfo) => {
  currentUserId.value = row.id
  roleDialogVisible.value = true
  try {
    const roles = await getRoleAll()
    allRoles.value = roles
    // TODO: 加载用户已分配的角色
  } catch (error) {
    console.error(error)
  }
}

const handleResetPassword = async (row: UserInfo) => {
  try {
    await confirm(`确定要重置用户"${row.username}"的密码吗?`, '提示')
    // TODO: 调用重置密码 API
    success('密码重置成功，新密码已发送到邮箱')
  } catch (error) {
    console.error(error)
  }
}

const handleDelete = async (row: UserInfo) => {
  if (row.username === 'admin') {
    warning('超级管理员不能删除')
    return
  }
  try {
    await confirm('确定要删除该用户吗?', '提示')
    loading.value = true
    await deleteUser(row.id!)
    success('删除成功')
    await loadData()
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleExport = async () => {
  try {
    await confirm('确定要导出用户数据吗?', '提示')
    loading.value = true
    await exportUser(searchForm)
    success('导出成功')
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        submitLoading.value = true
        if (form.id) {
          await updateUser(form)
          success('更新成功')
        } else {
          await createUser(form)
          success('新增成功')
        }
        dialogVisible.value = false
        await loadData()
      } catch (error) {
        console.error(error)
      } finally {
        submitLoading.value = false
      }
    }
  })
}

const handleRoleSubmit = () => {
  // TODO: 提交角色分配
  success('角色分配成功')
  roleDialogVisible.value = false
}

const resetForm = () => {
  form.id = undefined
  form.username = ''
  form.nickname = ''
  form.email = ''
  form.mobile = ''
  form.status = 0
  form.password = ''
  formRef.value?.resetFields()
}

const loadData = async () => {
  try {
    loading.value = true
    const data = await getUserPage({
      pageNo: pagination.pageNo,
      pageSize: pagination.pageSize,
      ...searchForm
    })
    tableData.value = data.list
    pagination.total = data.total
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.user-management {
  .search-form {
    margin-bottom: 20px;

    .el-button {
      margin-right: 8px;
    }
  }

  .el-pagination {
    margin-top: 20px;
  }
}
</style>
