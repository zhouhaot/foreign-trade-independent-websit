<template>
  <div class="module">
    <div class="module-header">
      <h2>分类管理</h2>
      <el-button type="primary" @click="openForm()">
        <el-icon><Plus /></el-icon> 新增分类
      </el-button>
    </div>

    <el-table :data="items" stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="nameCn" label="中文名称" min-width="200" />
      <el-table-column prop="nameEn" label="英文名称" min-width="200" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openForm(row)">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-popconfirm title="确认删除？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button size="small" type="danger">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <Form v-model:visible="formVisible" :category="currentItem" @saved="loadData" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { categories } from '../../api'
import { ElMessage } from 'element-plus'
import Form from './Form.vue'

const items = ref([])
const loading = ref(false)
const formVisible = ref(false)
const currentItem = ref(null)

async function loadData() {
  loading.value = true
  try {
    const res = await categories.list()
    items.value = res.data.data || []
  } finally {
    loading.value = false
  }
}

function openForm(item = null) {
  currentItem.value = item
  formVisible.value = true
}

async function handleDelete(id) {
  await categories.delete(id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.module-header h2 { font-size: 20px; font-weight: 600; color: #1f2937; margin: 0; }
</style>
