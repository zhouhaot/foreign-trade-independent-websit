<template>
  <div class="detail-page">
    <section class="page-hero">
      <div class="container">
        <div class="breadcrumb">
          <router-link to="/news">{{ t('nav.news') }}</router-link>
          <span>/</span>
          <span>{{ locale === 'zh' ? article.titleCn : article.titleEn }}</span>
        </div>
      </div>
    </section>

    <section class="section" v-if="article.id">
      <div class="container">
        <article class="article-detail">
          <div class="article-meta">
            <span class="article-date">{{ formatDate(article.createTime) }}</span>
          </div>
          <h1 class="article-title">
            {{ locale === 'zh' ? article.titleCn : article.titleEn }}
          </h1>
          <div class="article-cover" v-if="article.coverImage">
            <img :src="article.coverImage" :alt="article.titleEn">
          </div>
          <div class="article-content">
            <div class="content-cn" v-if="locale === 'zh'" v-html="formatContent(article.contentCn)"></div>
            <div class="content-en" v-else v-html="formatContent(article.contentEn)"></div>
          </div>
          <div class="article-footer">
            <router-link to="/news" class="btn btn-outline">{{ t('news.back') }} →</router-link>
          </div>
        </article>
      </div>
    </section>

    <section class="section" v-else>
      <div class="container">
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '../api'

const { t, locale } = useI18n()
const route = useRoute()
const article = ref({})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

function formatContent(content) {
  if (!content) return ''
  return content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>'
    })
}

onMounted(async () => {
  try {
    const res = await api.getArticle(route.params.id)
    article.value = res.data.data || {}
  } catch (e) {
    console.error('Failed to load article:', e)
  }
})
</script>

<style scoped>
.page-hero {
  padding: 120px 0 40px;
  background: radial-gradient(ellipse at 50% 0%, rgba(74, 158, 255, 0.06) 0%, transparent 60%);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--color-text-muted);
}

.breadcrumb a {
  color: var(--color-text-secondary);
  transition: color 0.2s;
}

.breadcrumb a:hover { color: var(--color-primary); }

.article-detail {
  max-width: 800px;
  margin: 0 auto;
}

.article-meta {
  margin-bottom: 16px;
}

.article-date {
  font-size: 14px;
  color: var(--color-text-muted);
}

.article-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-white);
  margin-bottom: 32px;
  line-height: 1.3;
}

.article-cover {
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 40px;
  border: 1px solid var(--color-border);
}

.article-cover img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
}

.article-content {
  font-size: 16px;
  color: var(--color-text);
  line-height: 1.8;
  margin-bottom: 48px;
}

.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3) {
  color: var(--color-white);
  margin: 32px 0 16px;
}

.article-content :deep(h2) { font-size: 24px; }
.article-content :deep(h3) { font-size: 20px; }

.article-content :deep(p) {
  margin-bottom: 16px;
}

.article-content :deep(strong) {
  color: var(--color-white);
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
}

.article-content :deep(li) {
  margin-bottom: 8px;
}

.article-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
  background: var(--color-bg-card);
  border-radius: 12px;
  overflow: hidden;
}

.article-content :deep(td) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.article-footer {
  padding-top: 32px;
  border-top: 1px solid var(--color-border);
}

.loading-state {
  text-align: center;
  padding: 80px 0;
  color: var(--color-text-muted);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .article-title { font-size: 28px; }
}
</style>
