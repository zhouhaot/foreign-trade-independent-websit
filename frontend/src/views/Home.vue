<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-gradient"></div>
        <div class="hero-grid"></div>
      </div>
      <div class="container hero-content">
        <h1 class="hero-title fade-in-up">{{ t('home.hero_title') }}</h1>
        <p class="hero-subtitle fade-in-up fade-in-up-delay-1">{{ t('home.hero_subtitle') }}</p>
        <div class="hero-actions fade-in-up fade-in-up-delay-2">
          <router-link to="/products" class="btn btn-primary">
            {{ t('home.hero_cta') }}
            <span>→</span>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="section">
      <div class="container">
        <h2 class="section-title">{{ t('home.featured') }}</h2>
        <p class="section-subtitle">{{ t('home.why_quality_desc') }}</p>
        <div class="products-grid">
          <div v-for="product in featuredProducts" :key="product.id" class="product-card card">
            <div class="product-image">
              <img :src="product.mainImage || '/uploads/placeholder.png'" :alt="product.nameEn">
              <div class="product-overlay">
                <router-link :to="`/products/${product.id}`" class="btn btn-primary btn-sm">
                  {{ t('products.view_detail') }}
                </router-link>
              </div>
            </div>
            <div class="product-info">
              <div class="product-category" v-if="product.categoryName">{{ product.categoryName }}</div>
              <h3 class="product-name">{{ locale === 'zh' ? product.nameCn : product.nameEn }}</h3>
              <div class="product-price">{{ product.price || t('products.contact_for_price') }}</div>
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
    <section class="section why-section">
      <div class="container">
        <h2 class="section-title">{{ t('home.why_title') }}</h2>
        <div class="features-grid">
          <div class="feature-card fade-in-up" v-for="(feature, i) in features" :key="i"
               :class="`fade-in-up-delay-${i + 1}`">
            <div class="feature-icon">{{ feature.icon }}</div>
            <h3 class="feature-title">{{ t(feature.titleKey) }}</h3>
            <p class="feature-desc">{{ t(feature.descKey) }}</p>
          </div>
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
const featuredProducts = ref([])

const features = [
  { icon: '✦', titleKey: 'home.why_quality', descKey: 'home.why_quality_desc' },
  { icon: '✈', titleKey: 'home.why_delivery', descKey: 'home.why_delivery_desc' },
  { icon: '☎', titleKey: 'home.why_support', descKey: 'home.why_support_desc' },
  { icon: '◆', titleKey: 'home.why_price', descKey: 'home.why_price_desc' }
]

onMounted(async () => {
  try {
    const res = await api.getFeaturedProducts(8)
    featuredProducts.value = res.data.data || []
  } catch (e) {
    console.error('Failed to load products:', e)
  }
})
</script>

<style scoped>
/* Hero */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 30% 50%, rgba(74, 158, 255, 0.12) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 50%, rgba(43, 125, 233, 0.08) 0%, transparent 50%);
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                     linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
}

.hero-content {
  position: relative;
  text-align: center;
  padding: 120px 0;
}

.hero-title {
  font-size: 64px;
  font-weight: 700;
  color: var(--color-white);
  line-height: 1.15;
  margin-bottom: 24px;
  letter-spacing: -2px;
  background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 18px;
  color: var(--color-text-secondary);
  max-width: 560px;
  margin: 0 auto 40px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* Products Grid */
.products-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.product-card {
  cursor: pointer;
}

.product-image {
  position: relative;
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

.product-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 15, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.product-card:hover .product-overlay {
  opacity: 1;
}

.btn-sm {
  padding: 10px 20px;
  font-size: 13px;
}

.product-info {
  padding: 20px;
}

.product-category {
  font-size: 12px;
  color: var(--color-primary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-white);
  margin-bottom: 8px;
}

.product-price {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.section-cta {
  text-align: center;
  margin-top: 48px;
}

/* Features */
.why-section {
  background: rgba(255, 255, 255, 0.01);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.feature-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 36px 28px;
  text-align: center;
  transition: all var(--transition);
}

.feature-card:hover {
  border-color: rgba(74, 158, 255, 0.2);
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 36px;
  margin-bottom: 20px;
  color: var(--color-primary);
}

.feature-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-white);
  margin-bottom: 12px;
}

.feature-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

@media (max-width: 768px) {
  .hero-title { font-size: 36px; letter-spacing: -1px; }
  .hero-subtitle { font-size: 16px; }
  .products-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .features-grid { grid-template-columns: 1fr; }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .products-grid { grid-template-columns: repeat(3, 1fr); }
  .features-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
