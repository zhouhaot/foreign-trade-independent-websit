<template>
  <div class="dashboard">
    <h2 class="page-title">Dashboard</h2>

    <div class="stats-grid">
      <el-card class="stat-card" v-for="s in stats" :key="s.label">
        <el-statistic :title="s.label" :value="s.value">
          <template #prefix>
            <el-icon :style="{ color: s.color }"><component :is="s.icon" /></el-icon>
          </template>
        </el-statistic>
      </el-card>
    </div>

    <el-card class="recent-inquiries">
      <template #header>
        <div class="card-header">
          <span>最近询盘</span>
          <el-link type="primary" @click="$router.push('/inquiries')">查看全部 →</el-link>
        </div>
      </template>
      <el-table :data="recentInquiries" stripe v-loading="loading" max-height="300">
        <el-table-column prop="contactName" label="联系人" width="120" />
        <el-table-column prop="companyName" label="公司" min-width="150" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="message" label="留言" min-width="200">
          <template #default="{ row }">
            {{ row.message?.length > 50 ? row.message.slice(0, 50) + '...' : row.message }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column prop="isRead" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isRead ? 'info' : 'danger'" size="small">
              {{ row.isRead ? '已读' : '未读' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { dashboard, inquiries } from '../../api'

const loading = ref(false)
const stats = ref([
  { label: '产品', value: 0, icon: 'Goods', color: '#1a56db' },
  { label: '分类', value: 0, icon: 'Menu', color: '#10b981' },
  { label: '文章', value: 0, icon: 'Document', color: '#f59e0b' },
  { label: '询盘', value: 0, icon: 'Message', color: '#ef4444' },
  { label: '未读询盘', value: 0, icon: 'Bell', color: '#f97316' }
])
const recentInquiries = ref([])

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(async () => {
  try {
    const [statsRes, inqRes] = await Promise.all([
      dashboard.getStats(),
      inquiries.list()
    ])
    const d = statsRes.data.data
    stats.value[0].value = d.productCount
    stats.value[1].value = d.categoryCount
    stats.value[2].value = d.articleCount
    stats.value[3].value = d.inquiryCount
    stats.value[4].value = d.unreadCount
    recentInquiries.value = (inqRes.data.data || []).slice(0, 5)
  } catch (e) {
    console.error('Failed to load dashboard:', e)
  }
})
</script>

<style scoped>
.page-title {
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #1f2937;
}

@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
