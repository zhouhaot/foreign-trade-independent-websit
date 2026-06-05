<template>
  <div class="detail-page">
    <section class="page-hero page-hero-compact">
      <div class="container">
        <div class="breadcrumb">
          <router-link to="/">{{ t('nav.home') }}</router-link>
          <span class="breadcrumb-sep">/</span>
          <router-link to="/news">{{ t('nav.news') }}</router-link>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current">{{ locale === 'zh' ? article.titleCn : article.titleEn }}</span>
        </div>
      </div>
    </section>

    <section class="section" v-if="article.id">
      <div class="container">
        <article class="article-detail">
          <header class="article-header">
            <div class="article-meta">
              <span class="article-date">{{ formatDate(article.createTime) }}</span>
            </div>
            <h1 class="article-title">
              {{ locale === 'zh' ? article.titleCn : article.titleEn }}
            </h1>
          </header>

          <div class="article-cover" v-if="article.coverImage">
            <img :src="article.coverImage" :alt="article.titleEn" @error="e => e.target.src='/uploads/placeholder.svg'">
          </div>

          <div class="article-content">
            <div class="content-cn" v-if="locale === 'zh'" v-html="formatContent(article.contentCn)"></div>
            <div class="content-en" v-else v-html="formatContent(article.contentEn)"></div>
          </div>

          <div class="article-footer">
            <router-link to="/news" class="btn btn-outline">
              <SvgIcon name="arrowLeft" :size="16" />
              {{ t('news.back') }}
            </router-link>
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
/* ===== Article ===== */
.article-detail {
  max-width: 780px;
  margin: 0 auto;
}

.article-header {
  margin-bottom: 32px;
}

.article-meta {
  margin-bottom: 16px;
}

.article-date {
  font-size: 14px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.article-title {
  font-size: 40px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.article-cover {
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 40px;
  border: 1px solid var(--color-border-light);
}

.article-cover img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
}

/* ===== Article Content ===== */
.article-content {
  font-size: 17px;
  color: var(--color-text);
  line-height: 1.85;
  margin-bottom: 48px;
}

.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3) {
  color: var(--color-text);
  margin: 36px 0 16px;
  line-height: 1.3;
}

.article-content :deep(h1) { font-size: 28px; font-weight: 700; }
.article-content :deep(h2) { font-size: 24px; font-weight: 700; }
.article-content :deep(h3) { font-size: 20px; font-weight: 600; }

.article-content :deep(p) {
  margin-bottom: 18px;
}

.article-content :deep(strong) {
  color: var(--color-text);
  font-weight: 600;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin: 20px 0;
  padding-left: 24px;
}

.article-content :deep(li) {
  margin-bottom: 10px;
}

.article-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 28px 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius);
  overflow: hidden;
}

.article-content :deep(tr:first-child td) {
  font-weight: 600;
  background: var(--color-bg-alt);
}

.article-content :deep(td) {
  padding: 12px 18px;
  border-bottom: 1px solid var(--color-border-light);
  font-size: 14px;
}

/* ===== Article Footer ===== */
.article-footer {
  padding-top: 32px;
  border-top: 1px solid var(--color-border-light);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .article-title { font-size: 28px; }
  .article-content { font-size: 16px; }
}
</style>
