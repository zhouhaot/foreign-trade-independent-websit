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
              <img :src="article.coverImage || '/uploads/placeholder.png'"
                   :alt="locale === 'zh' ? article.titleCn : article.titleEn">
            </div>
            <div class="article-body">
              <div class="article-date">
                {{ formatDate(article.createTime) }}
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
          <div class="empty-icon">📰</div>
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
.page-hero {
  padding: 140px 0 60px;
  text-align: center;
  background: radial-gradient(ellipse at 50% 0%, rgba(74, 158, 255, 0.08) 0%, transparent 60%);
}

.page-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--color-white);
  margin-bottom: 16px;
}

.page-subtitle {
  font-size: 18px;
  color: var(--color-text-secondary);
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.article-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
}

.article-image {
  aspect-ratio: 16/9;
  background: rgba(255, 255, 255, 0.03);
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
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.article-date {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.article-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-white);
  margin-bottom: 12px;
  line-height: 1.4;
}

.article-card:hover .article-title { color: var(--color-primary); }

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
  font-weight: 500;
}

.empty-state { text-align: center; padding: 80px 0; }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state p { color: var(--color-text-muted); font-size: 16px; }

@media (max-width: 768px) {
  .page-title { font-size: 32px; }
  .articles-grid { grid-template-columns: 1fr; }
}
</style>
