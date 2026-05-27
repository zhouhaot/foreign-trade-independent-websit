<template>
  <div class="about-page">
    <section class="page-hero">
      <div class="container">
        <h1 class="page-title fade-in-up">{{ t('about.title') }}</h1>
        <p class="page-subtitle fade-in-up fade-in-up-delay-1">{{ t('about.subtitle') }}</p>
      </div>
    </section>

    <!-- Story -->
    <section class="section">
      <div class="container">
        <div class="story-layout">
          <div class="story-content fade-in-up">
            <h2 class="section-title-left">{{ t('about.story_title') }}</h2>
            <p class="story-text">{{ t('about.story') }}</p>
          </div>
          <div class="story-visual fade-in-up fade-in-up-delay-2">
            <div class="visual-card">
              <div class="visual-gradient"></div>
              <div class="visual-icon">◆</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="section stats-section">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-card fade-in-up" v-for="(stat, i) in stats" :key="i" :class="`fade-in-up-delay-${i+1}`">
            <div class="stat-number">{{ stat.value }}</div>
            <div class="stat-label">{{ t(stat.key) }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Mission -->
    <section class="section">
      <div class="container">
        <div class="mission-block">
          <h2 class="section-title">{{ t('about.mission_title') }}</h2>
          <p class="mission-text">{{ t('about.mission') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const stats = [
  { value: '500+', key: 'about.stats_products' },
  { value: '80+', key: 'about.stats_countries' },
  { value: '10,000+', key: 'about.stats_orders' },
  { value: '8+', key: 'about.stats_years' }
]
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

.story-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.section-title-left {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-white);
  margin-bottom: 24px;
}

.story-text {
  font-size: 16px;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.visual-card {
  aspect-ratio: 1;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.visual-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(74, 158, 255, 0.15) 0%, transparent 70%);
}

.visual-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 80px;
  color: var(--color-primary);
  opacity: 0.5;
}

.stats-section {
  background: rgba(255, 255, 255, 0.01);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.stat-card {
  text-align: center;
  padding: 40px 20px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  transition: all 0.3s;
}

.stat-card:hover {
  border-color: rgba(74, 158, 255, 0.2);
  transform: translateY(-4px);
}

.stat-number {
  font-size: 42px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.mission-block {
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
}

.mission-text {
  font-size: 18px;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

@media (max-width: 768px) {
  .page-title { font-size: 32px; }
  .story-layout { grid-template-columns: 1fr; gap: 32px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
