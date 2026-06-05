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
            <div class="section-label">
              <span class="badge badge-blue">{{ t('about.story_title') }}</span>
            </div>
            <h2 class="story-heading">{{ t('about.story_title') }}</h2>
            <p class="story-text">{{ t('about.story') }}</p>
            <div class="story-features">
              <div class="story-feat" v-for="(feat, i) in storyFeatures" :key="i">
                <SvgIcon name="check" :size="14" class="story-feat-icon" />
                <span>{{ t(feat.key) }}</span>
              </div>
            </div>
          </div>
          <div class="story-visual fade-in-up fade-in-up-delay-2">
            <div class="visual-card">
              <div class="visual-bg"></div>
              <div class="visual-content">
                <SvgIcon name="diamond" :size="60" class="visual-logo" />
                <div class="visual-text">TradePlus</div>
                <div class="visual-sub">Since 2010</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="section-alt">
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
          <div class="section-label">
            <span class="badge badge-gold">{{ t('about.mission_title') }}</span>
          </div>
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

const storyFeatures = [
  { icon: '✓', key: 'home.why_quality' },
  { icon: '✓', key: 'home.why_delivery' },
  { icon: '✓', key: 'home.why_support' }
]
</script>

<style scoped>
/* ===== Story ===== */
.story-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}

.section-label {
  margin-bottom: 12px;
}

.story-heading {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 20px;
  letter-spacing: -0.5px;
}

.story-text {
  font-size: 16px;
  color: var(--color-text-secondary);
  line-height: 1.8;
  margin-bottom: 24px;
}

.story-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.story-feat {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
}

.story-feat-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--color-success-light);
  color: var(--color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ===== Visual Card ===== */
.visual-card {
  aspect-ratio: 1;
  border-radius: var(--radius-xl);
  overflow: hidden;
  position: relative;
  border: 1px solid var(--color-border-light);
  background: linear-gradient(135deg, var(--color-primary-light) 0%, #dbeafe 50%, var(--color-bg) 100%);
}

.visual-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 40%, rgba(30, 64, 175, 0.06) 0%, transparent 50%),
    radial-gradient(circle at 70% 60%, rgba(30, 64, 175, 0.03) 0%, transparent 40%);
}

.visual-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.visual-logo {
  color: var(--color-primary);
  opacity: 0.5;
}

.visual-text {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.5px;
}

.visual-sub {
  font-size: 14px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

/* ===== Stats ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.stat-card {
  text-align: center;
  padding: 48px 20px 40px;
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  transition: all var(--transition);
  cursor: pointer;
}

.stat-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-4px);
}

.stat-number {
  font-size: 48px;
  font-weight: 800;
  color: var(--color-primary);
  margin-bottom: 8px;
  letter-spacing: -1px;
}

.stat-label {
  font-size: 15px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* ===== Mission ===== */
.mission-block {
  text-align: center;
  max-width: 720px;
  margin: 0 auto;
}

.mission-block .section-title {
  margin-bottom: 20px;
}

.mission-text {
  font-size: 18px;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .story-layout { grid-template-columns: 1fr; gap: 32px; }
  .story-heading { font-size: 26px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .stat-card { padding: 32px 16px 28px; }
  .stat-number { font-size: 36px; }
}
</style>
