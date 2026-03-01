<template>
  <div class="menu-management">
    <ContentWrap>
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="菜单名称">
          <el-input v-model="searchForm.name" placeholder="请输入菜单名称" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="显示" :value="1" />
            <el-option label="隐藏" :value="0" />
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
          <el-button type="success" @click="handleExpandAll">
            <el-icon><DCaret /></el-icon>
            展开全部
          </el-button>
          <el-button type="warning" @click="handleCollapseAll">
            <el-icon><DArrowRight /></el-icon>
            折叠全部
          </el-button>
        </el-form-item>
      </el-form>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        row-key="id"
        :tree-props="{ children: 'children' }"
        default-expand-all
        style="width: 100%"
      >
        <el-table-column prop="name" label="菜单名称" width="220" fixed="left">
          <template #default="{ row }">
            <el-icon v-if="row.icon" style="margin-right: 8px; vertical-align: middle">
              <component :is="row.icon" />
            </el-icon>
            <span>{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="icon" label="图标" width="100">
          <template #default="{ row }">
            <el-icon v-if="row.icon" size="18">
              <component :is="row.icon" />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getMenuTypeTag(row.type)">
              {{ getMenuTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="路由路径" min-width="180" />
        <el-table-column prop="component" label="组件路径" min-width="180" />
        <el-table-column prop="permission" label="权限标识" min-width="150" />
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleAddChild(row)">
              <el-icon><Plus /></el-icon>
              新增
            </el-button>
            <el-button type="primary" link @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 菜单表单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="600px"
        :close-on-click-modal="false"
      >
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-form-item label="上级菜单" prop="parentId">
            <el-tree-select
              v-model="form.parentId"
              :data="menuTreeData"
              :props="{ label: 'name', value: 'id', children: 'children' }"
              placeholder="选择上级菜单"
              clearable
              check-strictly
            />
          </el-form-item>
          <el-form-item label="菜单类型" prop="type">
            <el-radio-group v-model="form.type">
              <el-radio value="menu">菜单</el-radio>
              <el-radio value="button">按钮</el-radio>
              <el-radio value="directory">目录</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="菜单名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入菜单名称" />
          </el-form-item>
          <el-form-item label="菜单图标" prop="icon">
            <el-input v-model="form.icon" placeholder="请输入图标名称" />
          </el-form-item>
          <el-form-item label="路由路径" prop="path">
            <el-input v-model="form.path" placeholder="请输入路由路径" />
          </el-form-item>
          <el-form-item v-if="form.type === 'menu'" label="组件路径" prop="component">
            <el-input v-model="form.component" placeholder="请输入组件路径" />
          </el-form-item>
          <el-form-item v-if="form.type === 'button'" label="权限标识" prop="permission">
            <el-input v-model="form.permission" placeholder="请输入权限标识" />
          </el-form-item>
          <el-form-item label="显示排序" prop="sort">
            <el-input-number v-model="form.sort" :min="0" :max="999" />
          </el-form-item>
          <el-form-item label="菜单状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio :value="1">显示</el-radio>
              <el-radio :value="0">隐藏</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
        </template>
      </el-dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useMessage } from '@/hooks/web/useMessage'
import type { MenuInfo } from '@/api/system/menu'
import { getMenuList, createMenu, updateMenu, deleteMenu } from '@/api/system/menu'
import {
  Search,
  Refresh,
  Plus,
  Edit,
  Delete,
  DCaret,
  DArrowRight
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

const { confirm, success, warning } = useMessage()

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增菜单')
const formRef = ref<FormInstance>()
const searchForm = reactive({
  name: '',
  status: undefined
})

const form = reactive<MenuInfo>({
  name: '',
  path: '',
  component: '',
  icon: '',
  sort: 0,
  status: 1,
  type: 'menu',
  parentId: 0
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
  path: [{ required: true, message: '请输入路由路径', trigger: 'blur' }],
  component: [{ required: true, message: '请输入组件路径', trigger: 'blur' }]
}

const tableData = ref<MenuInfo[]>([])

// 用于上级菜单选择的树形数据
const menuTreeData = computed(() => {
  const tree = [
    {
      id: 0,
      name: '主目录',
      children: tableData.value
    }
  ]
  return tree
})

const getMenuTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    menu: '菜单',
    button: '按钮',
    directory: '目录'
  }
  return typeMap[type] || type
}

const getMenuTypeTag = (type: string) => {
  const typeMap: Record<string, any> = {
    menu: 'primary',
    button: 'success',
    directory: 'warning'
  }
  return typeMap[type] || 'info'
}

const handleSearch = () => {
  loadData()
}

const handleReset = () => {
  searchForm.name = ''
  searchForm.status = undefined
  loadData()
}

const handleExpandAll = () => {
  const table = document.querySelector('.el-table') as any
  if (table) {
    table.store.states.expandRows.value = tableData.value
  }
}

const handleCollapseAll = () => {
  const table = document.querySelector('.el-table') as any
  if (table) {
    table.store.states.expandRows.value = []
  }
}

const handleAdd = () => {
  dialogTitle.value = '新增菜单'
  dialogVisible.value = true
  resetForm()
}

const handleAddChild = (row: MenuInfo) => {
  dialogTitle.value = '新增子菜单'
  dialogVisible.value = true
  resetForm()
  form.parentId = row.id
}

const handleEdit = (row: MenuInfo) => {
  dialogTitle.value = '编辑菜单'
  dialogVisible.value = true
  Object.assign(form, row)
}

const handleDelete = async (row: MenuInfo) => {
  if (row.children && row.children.length > 0) {
    warning('该菜单下有子菜单，不能删除')
    return
  }
  try {
    await confirm('确定要删除该菜单吗?', '提示')
    loading.value = true
    await deleteMenu(row.id!)
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
          await updateMenu(form)
          success('更新成功')
        } else {
          await createMenu(form)
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

const resetForm = () => {
  form.id = undefined
  form.name = ''
  form.path = ''
  form.component = ''
  form.icon = ''
  form.sort = 0
  form.status = 1
  form.type = 'menu'
  form.parentId = 0
  form.permission = ''
  formRef.value?.resetFields()
}

const loadData = async () => {
  try {
    loading.value = true
    const data = await getMenuList()
    tableData.value = data
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
.menu-management {
  .search-form {
    margin-bottom: 20px;

    .el-button {
      margin-right: 8px;
    }
  }

  :deep(.el-table) {
    .el-table__row {
      .el-table__cell {
        padding: 8px 0;
      }
    }
  }
}
</style>
