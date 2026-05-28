<template>
  <div class="module">
    <div class="module-header">
      <h2>产品管理</h2>
      <el-button type="primary" @click="openForm()">
        <el-icon><Plus /></el-icon> 新增产品
      </el-button>
    </div>

    <el-table :data="items" stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="nameCn" label="中文名称" min-width="150" />
      <el-table-column prop="nameEn" label="英文名称" min-width="150" />
      <el-table-column prop="categoryName" label="分类" width="140" />
      <el-table-column prop="price" label="价格" width="100" />
      <el-table-column prop="mainImage" label="图片" width="80">
        <template #default="{ row }">
          <el-image v-if="row.mainImage" :src="row.mainImage" :preview-src-list="[row.mainImage]" style="width:40px;height:40px" fit="cover" />
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? '上架' : '下架' }}
          </el-tag>
        </template>
      </el-table-column>
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

    <Form v-model:visible="formVisible" :product="currentItem" :categories="categoryList" @saved="loadData" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { products, categories } from '../../api'
import { ElMessage } from 'element-plus'
import Form from './Form.vue'

const items = ref([])
const categoryList = ref([])
const loading = ref(false)
const formVisible = ref(false)
const currentItem = ref(null)

async function loadData() {
  loading.value = true
  try {
    const [prodRes, catRes] = await Promise.all([products.list(), categories.list()])
    items.value = prodRes.data.data || []
    categoryList.value = catRes.data.data || []
  } finally {
    loading.value = false
  }
}

function openForm(item = null) {
  currentItem.value = item
  formVisible.value = true
}

async function handleDelete(id) {
  await products.delete(id)
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

.module-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}
</style>
