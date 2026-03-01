<template>
  <div class="role-management">
    <ContentWrap>
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="角色名称">
          <el-input v-model="searchForm.name" placeholder="请输入角色名称" clearable />
        </el-form-item>
        <el-form-item label="角色编码">
          <el-input v-model="searchForm.code" placeholder="请输入角色编码" clearable />
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
        <el-table-column prop="name" label="角色名称" min-width="150" />
        <el-table-column prop="code" label="角色编码" min-width="150" />
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'success' : 'danger'">
              {{ row.status === 0 ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="280" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="primary" link @click="handleAssignMenu(row)">
              <el-icon><Menu /></el-icon>
              菜单权限
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

      <!-- 角色表单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="600px"
        :close-on-click-modal="false"
      >
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-form-item label="角色名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入角色名称" />
          </el-form-item>
          <el-form-item label="角色编码" prop="code">
            <el-input v-model="form.code" placeholder="请输入角色编码" />
          </el-form-item>
          <el-form-item label="显示顺序" prop="sort">
            <el-input-number v-model="form.sort" :min="0" :max="999" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio :value="0">正常</el-radio>
              <el-radio :value="1">停用</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备注"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
        </template>
      </el-dialog>

      <!-- 菜单权限分配对话框 -->
      <el-dialog
        v-model="menuDialogVisible"
        title="分配菜单权限"
        width="500px"
        :close-on-click-modal="false"
      >
        <el-tree
          ref="menuTreeRef"
          :data="menuTreeData"
          :props="{ label: 'name', children: 'children' }"
          node-key="id"
          show-checkbox
          default-expand-all
        />
        <template #footer>
          <el-button @click="menuDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="menuSubmitLoading" @click="handleMenuSubmit">
            确定
          </el-button>
        </template>
      </el-dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useMessage } from '@/hooks/web/useMessage'
import type { RoleInfo } from '@/api/system/role'
import { getRolePage, createRole, updateRole, deleteRole, assignRoleMenu } from '@/api/system/role'
import { getMenuList } from '@/api/system/menu'
import { Search, Refresh, Plus, Edit, Delete, Menu } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { ElTree } from 'element-plus'

const { confirm, success, warning } = useMessage()

const loading = ref(false)
const submitLoading = ref(false)
const menuSubmitLoading = ref(false)
const dialogVisible = ref(false)
const menuDialogVisible = ref(false)
const dialogTitle = ref('新增角色')
const formRef = ref<FormInstance>()
const menuTreeRef = ref<InstanceType<typeof ElTree>>()

const searchForm = reactive({
  name: '',
  code: '',
  status: undefined
})

const pagination = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

const form = reactive<RoleInfo>({
  name: '',
  code: '',
  status: 0,
  remark: '',
  sort: 0
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '角色编码只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const tableData = ref<RoleInfo[]>([])
const menuTreeData = ref<any[]>([])
const currentRoleId = ref<number>()

const handleSearch = () => {
  pagination.pageNo = 1
  loadData()
}

const handleReset = () => {
  searchForm.name = ''
  searchForm.code = ''
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
  dialogTitle.value = '新增角色'
  dialogVisible.value = true
  resetForm()
}

const handleEdit = (row: RoleInfo) => {
  dialogTitle.value = '编辑角色'
  dialogVisible.value = true
  Object.assign(form, row)
}

const handleAssignMenu = async (row: RoleInfo) => {
  currentRoleId.value = row.id
  menuDialogVisible.value = true
  try {
    loading.value = true
    const menus = await getMenuList()
    menuTreeData.value = menus
    // TODO: 加载角色已分配的菜单权限
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (row: RoleInfo) => {
  if (row.code === 'admin') {
    warning('超级管理员不能删除')
    return
  }
  try {
    await confirm('确定要删除该角色吗?', '提示')
    loading.value = true
    await deleteRole(row.id!)
    success('删除成功')
    await loadData()
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
          await updateRole(form)
          success('更新成功')
        } else {
          await createRole(form)
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

const handleMenuSubmit = async () => {
  if (!menuTreeRef.value || !currentRoleId.value) return
  const checkedKeys = menuTreeRef.value.getCheckedKeys()
  const halfCheckedKeys = menuTreeRef.value.getHalfCheckedKeys()
  const menuIds = [...(checkedKeys as number[]), ...(halfCheckedKeys as number[])]
  try {
    menuSubmitLoading.value = true
    await assignRoleMenu(currentRoleId.value, menuIds)
    success('菜单权限分配成功')
    menuDialogVisible.value = false
  } catch (error) {
    console.error(error)
  } finally {
    menuSubmitLoading.value = false
  }
}

const resetForm = () => {
  form.id = undefined
  form.name = ''
  form.code = ''
  form.status = 0
  form.remark = ''
  form.sort = 0
  formRef.value?.resetFields()
}

const loadData = async () => {
  try {
    loading.value = true
    const data = await getRolePage({
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
.role-management {
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
