<template>
  <div class="detail-page">
    <section class="page-hero">
      <div class="container">
        <div class="breadcrumb">
          <router-link to="/products">{{ t('nav.products') }}</router-link>
          <span>/</span>
          <span>{{ locale === 'zh' ? product.nameCn : product.nameEn }}</span>
        </div>
      </div>
    </section>

    <section class="section" v-if="product.id">
      <div class="container">
        <div class="detail-layout">
          <!-- Image Gallery -->
          <div class="detail-gallery">
            <div class="main-image">
              <img :src="product.mainImage || '/uploads/placeholder.png'" :alt="product.nameEn">
            </div>
          </div>

          <!-- Product Info -->
          <div class="detail-info">
            <div class="product-category" v-if="product.categoryName">{{ product.categoryName }}</div>
            <h1 class="product-title">{{ locale === 'zh' ? product.nameCn : product.nameEn }}</h1>
            <div class="product-price">{{ product.price || t('products.contact_for_price') }}</div>
            <p class="product-description">
              {{ locale === 'zh' ? product.descriptionCn : product.descriptionEn }}
            </p>

            <!-- Specifications -->
            <div class="specifications" v-if="specs">
              <h3>{{ t('products.specifications') }}</h3>
              <div class="spec-grid">
                <div v-for="(value, key) in specs" :key="key" class="spec-item">
                  <span class="spec-key">{{ key }}</span>
                  <span class="spec-value">{{ value }}</span>
                </div>
              </div>
            </div>

            <!-- CTA -->
            <div class="detail-actions">
              <router-link :to="`/contact?product=${product.id}`" class="btn btn-primary btn-lg">
                {{ t('contact.form_submit') }} →
              </router-link>
            </div>
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

.breadcrumb a:hover {
  color: var(--color-primary);
}

.detail-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: start;
}

.main-image {
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
}

.main-image img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.detail-info {
  padding-top: 20px;
}

.product-category {
  font-size: 13px;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.product-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-white);
  margin-bottom: 16px;
  line-height: 1.2;
}

.product-price {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 24px;
}

.product-description {
  font-size: 16px;
  color: var(--color-text-secondary);
  line-height: 1.8;
  margin-bottom: 32px;
}

.specifications h3 {
  font-size: 18px;
  color: var(--color-white);
  margin-bottom: 16px;
}

.spec-grid {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 32px;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border);
}

.spec-item:last-child {
  border-bottom: none;
}

.spec-key {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.spec-value {
  color: var(--color-white);
  font-size: 14px;
  font-weight: 500;
}

.detail-actions .btn-lg {
  padding: 16px 36px;
  font-size: 16px;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .detail-layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .product-title { font-size: 28px; }
}
</style>
