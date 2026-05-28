<template>
  <div class="module">
    <div class="module-header">
      <h2>询盘管理</h2>
    </div>

    <el-table :data="items" stripe v-loading="loading" @row-click="openDetail">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="contactName" label="联系人" width="120" />
      <el-table-column prop="companyName" label="公司" min-width="150" />
      <el-table-column prop="email" label="邮箱" min-width="180" />
      <el-table-column prop="phone" label="电话" width="140" />
      <el-table-column prop="productName" label="相关产品" min-width="150" />
      <el-table-column prop="message" label="留言" min-width="200">
        <template #default="{ row }">{{ row.message?.length > 40 ? row.message.slice(0, 40) + '...' : row.message }}</template>
      </el-table-column>
      <el-table-column prop="createTime" label="时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column prop="isRead" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isRead ? 'info' : 'danger'" size="small">{{ row.isRead ? '已读' : '未读' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click.stop="openDetail(row)"><el-icon><View /></el-icon></el-button>
          <el-popconfirm title="确认删除？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button size="small" type="danger" @click.stop><el-icon><Delete /></el-icon></el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- Detail Drawer -->
    <el-drawer v-model="detailVisible" title="询盘详情" size="450px">
      <template v-if="currentDetail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="联系人">{{ currentDetail.contactName }}</el-descriptions-item>
          <el-descriptions-item label="公司">{{ currentDetail.companyName }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ currentDetail.email }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ currentDetail.phone }}</el-descriptions-item>
          <el-descriptions-item label="相关产品">{{ currentDetail.productName }}</el-descriptions-item>
          <el-descriptions-item label="留言">
            <div style="white-space: pre-wrap">{{ currentDetail.message }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentDetail.isRead ? 'success' : 'danger'" size="small">{{ currentDetail.isRead ? '已读' : '未读' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="时间">{{ formatTime(currentDetail.createTime) }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 20px">
          <el-button v-if="!currentDetail.isRead" type="primary" @click="markAsRead(currentDetail.id)">
            标记已读
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { inquiries } from '../../api'
import { ElMessage } from 'element-plus'

const items = ref([])
const loading = ref(false)
const detailVisible = ref(false)
const currentDetail = ref(null)

function formatTime(t) { return t ? new Date(t).toLocaleString('zh-CN') : '' }

async function loadData() {
  loading.value = true
  try {
    const res = await inquiries.list()
    items.value = res.data.data || []
  } finally {
    loading.value = false
  }
}

function openDetail(row) {
  currentDetail.value = { ...row }
  detailVisible.value = true
  if (!row.isRead) {
    markAsRead(row.id)
  }
}

async function markAsRead(id) {
  await inquiries.markRead(id)
  const item = items.value.find(i => i.id === id)
  if (item) item.isRead = 1
  if (currentDetail.value?.id === id) currentDetail.value.isRead = 1
}

async function handleDelete(id) {
  await inquiries.delete(id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.module-header h2 { font-size: 20px; font-weight: 600; color: #1f2937; margin: 0; }
.el-table :deep(.el-table__row) { cursor: pointer; }
</style>
