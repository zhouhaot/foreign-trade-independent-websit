<template>
  <div class="products-page">
    <section class="page-hero">
      <div class="container">
        <h1 class="page-title fade-in-up">{{ t('products.title') }}</h1>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <!-- Category Filter -->
        <div class="filter-bar">
          <button class="filter-btn" :class="{ active: !selectedCategory }" @click="selectedCategory = null">
            {{ t('products.all_categories') }}
          </button>
          <button v-for="cat in categories" :key="cat.id"
                  class="filter-btn"
                  :class="{ active: selectedCategory === cat.id }"
                  @click="selectedCategory = cat.id">
            {{ locale === 'zh' ? cat.nameCn : cat.nameEn }}
          </button>
        </div>

        <!-- Products Grid -->
        <div class="products-grid" v-if="filteredProducts.length">
          <div v-for="product in filteredProducts" :key="product.id" class="product-card card">
            <router-link :to="`/products/${product.id}`" class="product-image">
              <img :src="product.mainImage || '/uploads/placeholder.png'" :alt="product.nameEn">
            </router-link>
            <div class="product-info">
              <div class="product-category" v-if="product.categoryName">{{ product.categoryName }}</div>
              <router-link :to="`/products/${product.id}`" class="product-name">
                {{ locale === 'zh' ? product.nameCn : product.nameEn }}
              </router-link>
              <p class="product-desc">
                {{ locale === 'zh' ? product.descriptionCn : product.descriptionEn }}
              </p>
              <div class="product-footer">
                <div class="product-price">{{ product.price || t('products.contact_for_price') }}</div>
                <router-link :to="`/products/${product.id}`" class="btn btn-primary btn-sm">
                  {{ t('products.view_detail') }}
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-icon">📦</div>
          <p>{{ t('products.no_products') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../api'

const { t, locale } = useI18n()
const products = ref([])
const categories = ref([])
const selectedCategory = ref(null)

const filteredProducts = computed(() => {
  if (!selectedCategory.value) return products.value
  return products.value.filter(p => p.categoryId === selectedCategory.value)
})

onMounted(async () => {
  try {
    const [prodRes, catRes] = await Promise.all([
      api.getProducts(),
      api.getCategories()
    ])
    products.value = prodRes.data.data || []
    categories.value = catRes.data.data || []
  } catch (e) {
    console.error('Failed to load data:', e)
  }
})
</script>

<style scoped>
.page-hero {
  padding: 140px 0 60px;
  background: radial-gradient(ellipse at 50% 0%, rgba(74, 158, 255, 0.08) 0%, transparent 60%);
}

.page-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--color-white);
  text-align: center;
}

.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 40px;
  justify-content: center;
}

.filter-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-white);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.product-card {
  display: flex;
  flex-direction: column;
}

.product-image {
  display: block;
  aspect-ratio: 4/3;
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

.product-info {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-category {
  font-size: 12px;
  color: var(--color-primary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.product-name {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-white);
  margin-bottom: 12px;
  text-decoration: none;
  transition: color 0.2s;
}

.product-name:hover {
  color: var(--color-primary);
}

.product-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-price {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
}

.btn-sm {
  padding: 8px 16px;
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 80px 0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  color: var(--color-text-muted);
  font-size: 16px;
}

@media (max-width: 768px) {
  .page-title { font-size: 32px; }
  .products-grid { grid-template-columns: 1fr; }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .products-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
