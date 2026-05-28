<template>
  <div class="module">
    <div class="module-header">
      <h2>文章管理</h2>
      <el-button type="primary" @click="openForm()">
        <el-icon><Plus /></el-icon> 新增文章
      </el-button>
    </div>

    <el-table :data="items" stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="titleCn" label="中文标题" min-width="200" />
      <el-table-column prop="titleEn" label="英文标题" min-width="200" />
      <el-table-column prop="coverImage" label="封面" width="80">
        <template #default="{ row }">
          <el-image v-if="row.coverImage" :src="row.coverImage" :preview-src-list="[row.coverImage]" style="width:40px;height:40px" fit="cover" />
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '已发布' : '草稿' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openForm(row)"><el-icon><Edit /></el-icon></el-button>
          <el-popconfirm title="确认删除？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button size="small" type="danger"><el-icon><Delete /></el-icon></el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <Form v-model:visible="formVisible" :article="currentItem" @saved="loadData" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { articles } from '../../api'
import { ElMessage } from 'element-plus'
import Form from './Form.vue'

const items = ref([])
const loading = ref(false)
const formVisible = ref(false)
const currentItem = ref(null)

function formatTime(t) { return t ? new Date(t).toLocaleString('zh-CN') : '' }

async function loadData() {
  loading.value = true
  try {
    const res = await articles.list()
    items.value = res.data.data || []
  } finally {
    loading.value = false
  }
}

function openForm(item = null) { currentItem.value = item; formVisible.value = true }
async function handleDelete(id) { await articles.delete(id); ElMessage.success('删除成功'); loadData() }

onMounted(loadData)
</script>

<style scoped>
.module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.module-header h2 { font-size: 20px; font-weight: 600; color: #1f2937; margin: 0; }
</style>
