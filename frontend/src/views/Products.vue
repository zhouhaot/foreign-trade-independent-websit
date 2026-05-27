<template>
  <div class="products-page">
    <section class="page-hero">
      <div class="container">
        <h1 class="page-title fade-in-up">{{ t('products.title') }}</h1>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <!-- Search Bar -->
        <div class="search-bar">
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input type="text" v-model="keyword" :placeholder="t('products.search_placeholder')"
                   @input="handleSearch" class="search-input">
            <button v-if="keyword" class="search-clear" @click="clearSearch">×</button>
          </div>
        </div>

        <!-- Category Filter -->
        <div class="filter-bar">
          <button class="filter-btn" :class="{ active: !selectedCategory }" @click="filterByCategory(null)">
            {{ t('products.all_categories') }}
          </button>
          <button v-for="cat in categories" :key="cat.id"
                  class="filter-btn"
                  :class="{ active: selectedCategory === cat.id }"
                  @click="filterByCategory(cat.id)">
            {{ locale === 'zh' ? cat.nameCn : cat.nameEn }}
          </button>
        </div>

        <!-- Products Grid -->
        <div class="products-grid" v-if="products.length">
          <div v-for="product in products" :key="product.id" class="product-card card">
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
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../api'

const { t, locale } = useI18n()
const products = ref([])
const categories = ref([])
const selectedCategory = ref(null)
const keyword = ref('')
let searchTimer = null

async function loadProducts() {
  try {
    const res = await api.getProducts(selectedCategory.value, keyword.value)
    products.value = res.data.data || []
  } catch (e) {
    console.error('Failed to load products:', e)
  }
}

function handleSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadProducts(), 300)
}

function clearSearch() {
  keyword.value = ''
  loadProducts()
}

function filterByCategory(catId) {
  selectedCategory.value = catId
  loadProducts()
}

onMounted(async () => {
  try {
    const catRes = await api.getCategories()
    categories.value = catRes.data.data || []
    await loadProducts()
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

.search-bar {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.search-input-wrap {
  position: relative;
  width: 100%;
  max-width: 500px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  opacity: 0.5;
}

.search-input {
  width: 100%;
  padding: 14px 44px 14px 48px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: var(--color-white);
  font-size: 15px;
  outline: none;
  transition: border-color 0.3s;
}

.search-input:focus { border-color: var(--color-primary); }

.search-input::placeholder { color: var(--color-text-muted); }

.search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.search-clear:hover { background: rgba(255, 255, 255, 0.2); }

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

.filter-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

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

.product-card { display: flex; flex-direction: column; }

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

.product-card:hover .product-image img { transform: scale(1.05); }

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

.product-name:hover { color: var(--color-primary); }

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

.btn-sm { padding: 8px 16px; font-size: 13px; }

.empty-state { text-align: center; padding: 80px 0; }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state p { color: var(--color-text-muted); font-size: 16px; }

@media (max-width: 768px) {
  .page-title { font-size: 32px; }
  .products-grid { grid-template-columns: 1fr; }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .products-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
