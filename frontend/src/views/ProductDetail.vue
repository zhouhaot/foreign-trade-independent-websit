<template>
  <div class="detail-page">
    <section class="page-hero page-hero-compact">
      <div class="container">
        <div class="breadcrumb">
          <router-link to="/">{{ t('nav.home') }}</router-link>
          <span class="breadcrumb-sep">/</span>
          <router-link to="/products">{{ t('nav.products') }}</router-link>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current">{{ locale === 'zh' ? product.nameCn : product.nameEn }}</span>
        </div>
      </div>
    </section>

    <section class="section" v-if="product.id">
      <div class="container">
        <div class="detail-layout">
          <!-- Image Gallery -->
          <div class="detail-gallery">
            <div class="main-image">
              <img :src="product.mainImage || '/uploads/placeholder.svg'" :alt="product.nameEn" @error="e => e.target.src='/uploads/placeholder.svg'">
            </div>
          </div>

          <!-- Product Info -->
          <div class="detail-info">
            <div class="detail-head">
              <span class="product-category" v-if="product.categoryName">{{ product.categoryName }}</span>
              <h1 class="product-title">{{ locale === 'zh' ? product.nameCn : product.nameEn }}</h1>
            </div>

            <div class="product-price">{{ product.price || t('products.contact_for_price') }}</div>

            <p class="product-description">
              {{ locale === 'zh' ? product.descriptionCn : product.descriptionEn }}
            </p>

            <!-- Specifications -->
            <div class="specifications" v-if="specs">
              <h3 class="spec-heading">{{ t('products.specifications') }}</h3>
              <div class="spec-table">
                <div v-for="(value, key) in specs" :key="key" class="spec-row">
                  <span class="spec-key">{{ key }}</span>
                  <span class="spec-value">{{ value }}</span>
                </div>
              </div>
            </div>

            <!-- CTA -->
            <div class="detail-actions">
              <router-link :to="`/contact?product=${product.id}`" class="btn btn-primary btn-lg">
                {{ t('contact.form_submit') }}
                <SvgIcon name="arrowRight" :size="18" />
              </router-link>
              <span class="cta-note">
                <span class="cta-check">
                  <SvgIcon name="check" :size="12" />
                </span> {{ t('contact.success_msg') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Inquiry CTA Banner -->
        <div class="inquiry-banner">
          <div class="banner-content">
            <div class="banner-text">
              <h3>{{ t('home.hero_title') }}</h3>
              <p>{{ t('home.hero_subtitle') }}</p>
            </div>
            <router-link to="/contact" class="btn btn-accent btn-lg">
              {{ t('contact.form_submit') }}
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Loading -->
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '../api'

const { t, locale } = useI18n()
const route = useRoute()
const product = ref({})

const specs = computed(() => {
  if (!product.value.specifications) return null
  try {
    return JSON.parse(product.value.specifications)
  } catch {
    return null
  }
})

onMounted(async () => {
  try {
    const res = await api.getProduct(route.params.id)
    product.value = res.data.data || {}
  } catch (e) {
    console.error('Failed to load product:', e)
  }
})
</script>

<style scoped>
/* ===== Detail Layout ===== */
.detail-layout {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 56px;
  align-items: start;
}

.main-image {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: #f1f5f9;
  border: 1px solid var(--color-border-light);
}

.main-image img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

/* ===== Detail Info ===== */
.detail-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-category {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.product-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.product-price {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-accent);
}

.product-description {
  font-size: 15px;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

/* ===== Specifications ===== */
.specifications {
  margin-top: 4px;
}

.spec-heading {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
}

.spec-table {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius);
  overflow: hidden;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--color-border-light);
}

.spec-row:last-child { border-bottom: none; }

.spec-key {
  color: var(--color-text-muted);
  font-size: 13px;
}

.spec-value {
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
}

/* ===== CTA ===== */
.detail-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 8px;
}

.detail-actions .btn-lg {
  padding: 16px 40px;
  font-size: 16px;
}

.cta-note {
  font-size: 13px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.cta-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-success-light);
  color: var(--color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ===== Inquiry CTA Banner ===== */
.inquiry-banner {
  margin-top: 64px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40px 48px;
  gap: 32px;
}

.banner-text h3 {
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.banner-text p {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .detail-layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .product-title { font-size: 26px; }
  .product-price { font-size: 22px; }
  .detail-actions { flex-direction: column; align-items: stretch; }
  .detail-actions .btn-lg { text-align: center; }
  .banner-content {
    flex-direction: column;
    text-align: center;
    padding: 28px 24px;
  }
}
</style>
