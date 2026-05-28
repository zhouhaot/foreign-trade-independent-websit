<template>
  <div class="module">
    <div class="module-header">
      <h2>轮播图管理</h2>
      <el-button type="primary" @click="openForm()">
        <el-icon><Plus /></el-icon> 新增轮播图
      </el-button>
    </div>

    <el-table :data="items" stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="image" label="图片" width="100">
        <template #default="{ row }">
          <el-image v-if="row.image" :src="row.image" :preview-src-list="[row.image]" style="width:80px;height:45px" fit="cover" />
        </template>
      </el-table-column>
      <el-table-column prop="titleCn" label="中文标题" min-width="150" />
      <el-table-column prop="titleEn" label="英文标题" min-width="150" />
      <el-table-column prop="subtitleCn" label="副标题" min-width="180">
        <template #default="{ row }">{{ row.subtitleCn || row.subtitleEn }}</template>
      </el-table-column>
      <el-table-column prop="linkUrl" label="链接" width="160" />
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
        </template>
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

    <Form v-model:visible="formVisible" :banner="currentItem" @saved="loadData" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { banners } from '../../api'
import { ElMessage } from 'element-plus'
import Form from './Form.vue'

const items = ref([])
const loading = ref(false)
const formVisible = ref(false)
const currentItem = ref(null)

async function loadData() {
  loading.value = true
  try {
    const res = await banners.list()
    items.value = res.data.data || []
  } finally {
    loading.value = false
  }
}

function openForm(item = null) { currentItem.value = item; formVisible.value = true }
async function handleDelete(id) { await banners.delete(id); ElMessage.success('删除成功'); loadData() }

onMounted(loadData)
</script>

<style scoped>
.module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.module-header h2 { font-size: 20px; font-weight: 600; color: #1f2937; margin: 0; }
</style>
