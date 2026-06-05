<template>
  <div class="home">
    <!-- Banner Carousel -->
    <section class="hero" v-if="banners.length">
      <div class="hero-bg">
        <div class="hero-gradient"></div>
      </div>
      <div class="carousel">
        <div class="carousel-inner" :style="{ transform: `translateX(-${currentBanner * 100}%)` }">
          <div v-for="(banner, i) in banners" :key="i" class="carousel-slide">
            <div class="container hero-content">
              <h1 class="hero-title fade-in-up">
                {{ locale === 'zh' ? banner.titleCn : banner.titleEn }}
              </h1>
              <p class="hero-subtitle fade-in-up fade-in-up-delay-1">
                {{ locale === 'zh' ? banner.subtitleCn : banner.subtitleEn }}
              </p>
              <div class="hero-actions fade-in-up fade-in-up-delay-2">
                <router-link :to="banner.linkUrl || '/products'" class="btn btn-primary btn-lg">
                  {{ t('home.hero_cta') }}
                  <SvgIcon name="arrowRight" :size="18" />
                </router-link>
                <router-link to="/contact" class="btn btn-outline btn-lg">
                  {{ t('contact.form_submit') }}
                </router-link>
              </div>
            </div>
          </div>
        </div>
        <div class="carousel-dots" v-if="banners.length > 1">
          <button v-for="(_, i) in banners" :key="i"
                  :class="{ active: currentBanner === i }"
                  :aria-label="`Go to slide ${i + 1}`"
                  @click="currentBanner = i"></button>
        </div>
      </div>
    </section>

    <!-- Hero (fallback when no banners) -->
    <section class="hero" v-else>
      <div class="hero-bg">
        <div class="hero-gradient"></div>
      </div>
      <div class="container hero-content">
        <div class="hero-badge badge badge-blue fade-in-up">{{ t('home.team_stat_years_label') }}</div>
        <h1 class="hero-title fade-in-up fade-in-up-delay-1">{{ t('home.hero_title') }}</h1>
        <p class="hero-subtitle fade-in-up fade-in-up-delay-2">{{ t('home.hero_subtitle') }}</p>
        <div class="hero-actions fade-in-up fade-in-up-delay-3">
          <router-link to="/products" class="btn btn-primary btn-lg">
            {{ t('home.hero_cta') }}
            <SvgIcon name="arrowRight" :size="18" />
          </router-link>
          <router-link to="/contact" class="btn btn-outline btn-lg">
            {{ t('contact.form_submit') }}
          </router-link>
        </div>
        <div class="hero-stats fade-in-up fade-in-up-delay-4">
          <div class="hero-stat" v-for="stat in heroStats" :key="stat.label">
            <span class="hero-stat-value">{{ stat.value }}</span>
            <span class="hero-stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="section">
      <div class="container">
        <h2 class="section-title">{{ t('home.featured') }}</h2>
        <p class="section-subtitle">{{ t('home.hero_subtitle') }}</p>
        <div class="products-grid">
          <div v-for="product in featuredProducts" :key="product.id" class="product-card card">
            <router-link :to="`/products/${product.id}`" class="product-image">
              <img :src="product.mainImage || '/uploads/placeholder.svg'" :alt="product.nameEn" loading="lazy" @error="e => e.target.src='/uploads/placeholder.svg'">
              <div class="product-category-tag">{{ product.categoryName }}</div>
            </router-link>
            <div class="product-info">
              <router-link :to="`/products/${product.id}`" class="product-name">
                {{ locale === 'zh' ? product.nameCn : product.nameEn }}
              </router-link>
              <p class="product-spec-summary" v-if="product.specifications">
                {{ getSpecSummary(product.specifications) }}
              </p>
              <div class="product-footer">
                <span class="product-price">{{ product.price || t('products.contact_for_price') }}</span>
                <router-link :to="`/products/${product.id}`" class="btn btn-outline btn-sm">
                  {{ t('products.view_detail') }}
                </router-link>
              </div>
            </div>
          </div>
        </div>
        <div class="section-cta">
          <router-link to="/products" class="btn btn-outline">
            {{ t('home.view_all') }} →
          </router-link>
        </div>
      </div>
    </section>

    <!-- Why Choose Us -->
    <section class="section-alt">
      <div class="container">
        <h2 class="section-title">{{ t('home.why_title') }}</h2>
        <div class="features-grid">
          <div class="feature-card fade-in-up" v-for="(feature, i) in features" :key="i"
               :class="`fade-in-up-delay-${i + 1}`">
            <div class="feature-icon-wrap">
              <SvgIcon :name="feature.icon" :size="24" class="feature-icon" />
            </div>
            <h3 class="feature-title">{{ t(feature.titleKey) }}</h3>
            <p class="feature-desc">{{ t(feature.descKey) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Partners -->
    <section class="section">
      <div class="container">
        <div class="partners-header">
          <span class="badge badge-blue">Trusted By</span>
        </div>
        <h2 class="section-title">{{ t('home.partners_title') }}</h2>
        <p class="section-subtitle">{{ t('home.partners_subtitle') }}</p>
        <div class="partners-grid">
          <div v-for="brand in partnerBrands" :key="brand" class="partner-logo">
            <span class="partner-placeholder">{{ brand }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Service Process -->
    <section class="section-alt">
      <div class="container">
        <h2 class="section-title">{{ t('home.service_title') }}</h2>
        <p class="section-subtitle">{{ t('home.service_subtitle') }}</p>
        <div class="process-grid">
          <div class="process-step" v-for="(step, i) in serviceSteps" :key="i">
            <div class="step-number">{{ i + 1 }}</div>
            <h3 class="step-title">{{ t(step.titleKey) }}</h3>
            <p class="step-desc">{{ t(step.descKey) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Team Introduction -->
    <section class="section">
      <div class="container">
        <h2 class="section-title">{{ t('home.team_title') }}</h2>
        <p class="section-subtitle">{{ t('home.team_subtitle') }}</p>
        <div class="team-layout">
          <div class="team-advantages">
            <div class="advantage-card" v-for="(adv, i) in teamAdvantages" :key="i">
              <div class="advantage-icon">
                <SvgIcon :name="adv.icon" :size="20" />
              </div>
              <div>
                <h3 class="advantage-title">{{ t(adv.titleKey) }}</h3>
                <p class="advantage-desc">{{ t(adv.descKey) }}</p>
              </div>
            </div>
          </div>
          <div class="team-stats">
            <div class="stat-card" v-for="(stat, i) in teamStats" :key="i">
              <div class="stat-number">{{ t(stat.valueKey) }}</div>
              <div class="stat-label">{{ t(stat.labelKey) }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../api'

const { t, locale } = useI18n()
const featuredProducts = ref([])
const banners = ref([])
const currentBanner = ref(0)
let bannerTimer = null

const features = [
  { icon: 'shield', titleKey: 'home.why_quality', descKey: 'home.why_quality_desc' },
  { icon: 'globe', titleKey: 'home.why_delivery', descKey: 'home.why_delivery_desc' },
  { icon: 'headphones', titleKey: 'home.why_support', descKey: 'home.why_support_desc' },
  { icon: 'tag', titleKey: 'home.why_price', descKey: 'home.why_price_desc' }
]

const serviceSteps = [
  { titleKey: 'home.service_step1_title', descKey: 'home.service_step1_desc' },
  { titleKey: 'home.service_step2_title', descKey: 'home.service_step2_desc' },
  { titleKey: 'home.service_step3_title', descKey: 'home.service_step3_desc' },
  { titleKey: 'home.service_step4_title', descKey: 'home.service_step4_desc' }
]

const teamAdvantages = [
  { icon: 'zap', titleKey: 'home.team_advantage1_title', descKey: 'home.team_advantage1_desc' },
  { icon: 'badgeCheck', titleKey: 'home.team_advantage2_title', descKey: 'home.team_advantage2_desc' },
  { icon: 'lifeBuoy', titleKey: 'home.team_advantage3_title', descKey: 'home.team_advantage3_desc' }
]

const teamStats = [
  { valueKey: 'home.team_stat_years', labelKey: 'home.team_stat_years_label' },
  { valueKey: 'home.team_stat_countries', labelKey: 'home.team_stat_countries_label' },
  { valueKey: 'home.team_stat_customers', labelKey: 'home.team_stat_customers_label' },
  { valueKey: 'home.team_stat_support', labelKey: 'home.team_stat_support_label' }
]

const heroStats = [
  { value: '15+', label: t('home.team_stat_years_label') },
  { value: '50+', label: t('home.team_stat_countries_label') },
  { value: '1000+', label: t('home.team_stat_customers_label') }
]

const partnerBrands = [
  'ICBC', 'HSBC', 'Bank of America', 'Deutsche Bank', 'BNP Paribas',
  'Standard Chartered', 'DBS', 'MUFG', 'Santander', 'UBS'
]

function getSpecSummary(specJson) {
  try {
    const specs = JSON.parse(specJson)
    const keys = Object.keys(specs).slice(0, 3)
    return keys.map(k => `${k}: ${specs[k]}`).join(' · ')
  } catch {
    return ''
  }
}

function startBannerRotation() {
  if (banners.value.length > 1) {
    bannerTimer = setInterval(() => {
      currentBanner.value = (currentBanner.value + 1) % banners.value.length
    }, 5000)
  }
}

onMounted(async () => {
  try {
    const [prodRes, bannerRes] = await Promise.all([
      api.getFeaturedProducts(8),
      api.getBanners()
    ])
    featuredProducts.value = prodRes.data.data || []
    banners.value = bannerRes.data.data || []
    startBannerRotation()
  } catch (e) {
    console.error('Failed to load data:', e)
  }
})

onUnmounted(() => {
  if (bannerTimer) clearInterval(bannerTimer)
})
</script>

<style scoped>
/* ===== Hero ===== */
.hero {
  position: relative;
  min-height: 85vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: linear-gradient(170deg, #eff6ff 0%, #ffffff 40%, #f8fafc 100%);
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(30, 64, 175, 0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(30, 64, 175, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(217, 119, 6, 0.03) 0%, transparent 40%);
}

/* Carousel */
.carousel {
  position: relative;
  width: 100%;
}

.carousel-inner {
  display: flex;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.carousel-slide {
  min-width: 100%;
  display: flex;
  align-items: center;
}

.carousel-dots {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.carousel-dots button {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: rgba(30, 64, 175, 0.2);
  cursor: pointer;
  transition: all 0.3s;
}

.carousel-dots button.active {
  background: var(--color-primary);
  width: 28px;
  border-radius: 5px;
}

.hero-content {
  position: relative;
  text-align: center;
  padding: 100px 0;
  max-width: 780px;
  margin: 0 auto;
}

.hero-badge {
  margin-bottom: 20px;
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.12;
  margin-bottom: 24px;
  letter-spacing: -1.5px;
}

.hero-subtitle {
  font-size: 18px;
  color: var(--color-text-secondary);
  max-width: 560px;
  margin: 0 auto 36px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 48px;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--color-border-light);
}

.hero-stat {
  text-align: center;
}

.hero-stat-value {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: -0.5px;
}

.hero-stat-label {
  display: block;
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

/* ===== Products Grid ===== */
.products-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.product-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
}

.product-image {
  position: relative;
  display: block;
  aspect-ratio: 4/3;
  background: #f1f5f9;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.product-card:hover .product-image img { transform: scale(1.05); }

.product-category-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

.product-info {
  padding: 18px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  text-decoration: none;
  transition: color 0.2s;
  line-height: 1.4;
}

.product-name:hover { color: var(--color-primary); }

.product-spec-summary {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
}

.product-price {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
}

.section-cta { text-align: center; margin-top: 48px; }

/* ===== Features ===== */
.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.feature-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 36px 28px;
  text-align: center;
  transition: all var(--transition);
  cursor: pointer;
}

.feature-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-4px);
}

.feature-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.feature-icon { color: var(--color-primary); }

.feature-title { font-size: 17px; font-weight: 600; color: var(--color-text); margin-bottom: 10px; }
.feature-desc { font-size: 14px; color: var(--color-text-secondary); line-height: 1.6; }

/* ===== Partners ===== */
.partners-header {
  text-align: center;
  margin-bottom: 12px;
}

.partners-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  margin-top: 32px;
}

.partner-logo {
  aspect-ratio: 3/1;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
  cursor: pointer;
}

.partner-logo:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card);
}

.partner-placeholder {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
}

/* ===== Service Process ===== */
.process-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.process-step {
  position: relative;
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 32px 24px;
  text-align: center;
  transition: all var(--transition);
  cursor: pointer;
}

.process-step:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-4px);
}

.step-number {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.step-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
}

.step-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* ===== Team Section ===== */
.team-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
}

.team-advantages {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.advantage-card {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 24px;
  transition: all var(--transition);
  cursor: pointer;
}

.advantage-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card);
  transform: translateX(4px);
}

.advantage-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.advantage-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
}

.advantage-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.team-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 28px 20px;
  text-align: center;
  transition: all var(--transition);
  cursor: pointer;
}

.stat-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card);
  transform: translateY(-4px);
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-muted);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .hero {
    min-height: 70vh;
  }
  .hero-title { font-size: 32px; letter-spacing: -0.5px; }
  .hero-stats { gap: 24px; flex-wrap: wrap; }
  .products-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .features-grid { grid-template-columns: 1fr 1fr; gap: 16px; }
  .process-grid { grid-template-columns: 1fr 1fr; gap: 16px; }
  .team-layout { grid-template-columns: 1fr; gap: 32px; }
  .team-stats { grid-template-columns: repeat(2, 1fr); }
  .partners-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .products-grid { grid-template-columns: repeat(3, 1fr); }
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .process-grid { grid-template-columns: repeat(2, 1fr); }
  .partners-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  .product-card:hover .product-image img { transform: none; }
}
</style>
