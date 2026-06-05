<template>
  <div class="news-page">
    <section class="page-hero">
      <div class="container">
        <h1 class="page-title fade-in-up">{{ t('news.title') }}</h1>
        <p class="page-subtitle fade-in-up fade-in-up-delay-1">{{ t('news.subtitle') }}</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="articles-grid" v-if="articles.length">
          <router-link v-for="article in articles" :key="article.id"
                       :to="`/news/${article.id}`" class="article-card card">
            <div class="article-image">
              <img :src="article.coverImage || '/uploads/placeholder.svg'"
                   :alt="locale === 'zh' ? article.titleCn : article.titleEn"
                   loading="lazy"
                   @error="e => e.target.src='/uploads/placeholder.svg'">
            </div>
            <div class="article-body">
              <div class="article-meta">
                <span class="article-date">{{ formatDate(article.createTime) }}</span>
              </div>
              <h3 class="article-title">
                {{ locale === 'zh' ? article.titleCn : article.titleEn }}
              </h3>
              <p class="article-excerpt">
                {{ getExcerpt(locale === 'zh' ? article.contentCn : article.contentEn) }}
              </p>
              <span class="article-link">{{ t('news.read_more') }} →</span>
            </div>
          </router-link>
        </div>

        <div v-else class="empty-state">
          <SvgIcon name="newspaper" :size="48" class="empty-icon" />
          <p>{{ t('news.no_articles') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../api'

const { t, locale } = useI18n()
const articles = ref([])

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

function getExcerpt(content) {
  if (!content) return ''
  const text = content.replace(/[#*\n]/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > 150 ? text.substring(0, 150) + '...' : text
}

onMounted(async () => {
  try {
    const res = await api.getArticles(20)
    articles.value = res.data.data || []
  } catch (e) {
    console.error('Failed to load articles:', e)
  }
})
</script>

<style scoped>
/* ===== Articles Grid ===== */
.articles-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px;
}

.article-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition);
}

.article-card:hover {
  border-color: var(--color-border);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-3px);
}

.article-card:hover .article-title { color: var(--color-primary); }

.article-image {
  aspect-ratio: 16/9;
  background: #f1f5f9;
  overflow: hidden;
}

.article-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.article-card:hover .article-image img { transform: scale(1.05); }

.article-body {
  padding: 24px 28px 28px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.article-meta {
  margin-bottom: 10px;
}

.article-date {
  font-size: 13px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.article-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
  line-height: 1.4;
  transition: color 0.2s;
}

.article-excerpt {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
  flex: 1;
}

.article-link {
  font-size: 14px;
  color: var(--color-primary);
  font-weight: 600;
}

.empty-icon {
  color: var(--color-text-muted);
  margin-bottom: 16px;
  opacity: 0.5;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .articles-grid { grid-template-columns: 1fr; gap: 20px; }
  .article-body { padding: 18px 20px 22px; }
  .article-title { font-size: 18px; }
}

@media (prefers-reduced-motion: reduce) {
  .article-card:hover .article-image img { transform: none; }
}
</style>
