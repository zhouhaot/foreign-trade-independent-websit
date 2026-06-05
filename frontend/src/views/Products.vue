<template>
  <div class="products-page">
    <section class="page-hero">
      <div class="container">
        <h1 class="page-title fade-in-up">{{ t('products.title') }}</h1>
        <p class="page-subtitle fade-in-up fade-in-up-delay-1">{{ t('home.hero_subtitle') }}</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <!-- Search Bar -->
        <div class="search-bar">
          <div class="search-input-wrap">
            <span class="search-icon">
              <SvgIcon name="search" :size="18" />
            </span>
            <input type="text" v-model="keyword" :placeholder="t('products.search_placeholder')"
                   @input="handleSearch" class="search-input">
            <button v-if="keyword" class="search-clear" @click="clearSearch" aria-label="Clear search">
              <SvgIcon name="x" :size="16" />
            </button>
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

        <!-- Products Grid — Horizontal Cards -->
        <div class="products-grid" v-if="products.length">
          <div v-for="product in products" :key="product.id" class="product-card card">
            <router-link :to="`/products/${product.id}`" class="product-image">
              <img :src="product.mainImage || '/uploads/placeholder.svg'" :alt="product.nameEn" loading="lazy" @error="e => e.target.src='/uploads/placeholder.svg'">
            </router-link>
            <div class="product-body">
              <div class="product-head">
                <span class="product-category" v-if="product.categoryName">{{ product.categoryName }}</span>
                <router-link :to="`/products/${product.id}`" class="product-name">
                  {{ locale === 'zh' ? product.nameCn : product.nameEn }}
                </router-link>
              </div>
              <p class="product-desc">
                {{ locale === 'zh' ? product.descriptionCn : product.descriptionEn }}
              </p>
              <div class="product-specs" v-if="product.specifications">
                <div class="spec-row" v-for="(value, key, idx) in getSpecEntries(product.specifications)" :key="key">
                  <span class="spec-key">{{ key }}</span>
                  <span class="spec-value">{{ value }}</span>
                </div>
              </div>
              <div class="product-footer">
                <span class="product-price">{{ product.price || t('products.contact_for_price') }}</span>
                <router-link :to="`/products/${product.id}`" class="btn btn-primary btn-sm">
                  {{ t('products.view_detail') }}
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <SvgIcon name="package" :size="48" class="empty-icon" />
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

function getSpecEntries(specJson) {
  try {
    const specs = JSON.parse(specJson)
    return Object.entries(specs).slice(0, 4)
  } catch {
    return []
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
/* ===== Search Bar ===== */
.search-bar {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.search-input-wrap {
  position: relative;
  width: 100%;
  max-width: 520px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 14px 44px 14px 46px;
  background: var(--color-bg-card);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.25s, box-shadow 0.25s;
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-glow);
}

.search-input::placeholder { color: var(--color-text-muted); }

.search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: var(--color-border-light);
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.search-clear:hover { background: var(--color-border); color: var(--color-text); }

/* ===== Filter Bar ===== */
.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 40px;
  justify-content: center;
}

.filter-btn {
  padding: 10px 22px;
  border-radius: 8px;
  border: 1.5px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.filter-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

.filter-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-white);
}

/* ===== Products Grid — Horizontal Cards ===== */
.products-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.product-card {
  display: grid;
  grid-template-columns: 280px 1fr;
  overflow: hidden;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  transition: all var(--transition);
  cursor: pointer;
}

.product-card:hover {
  border-color: var(--color-border);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.product-image {
  display: block;
  background: #f1f5f9;
  overflow: hidden;
  border-right: 1px solid var(--color-border-light);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.product-card:hover .product-image img { transform: scale(1.05); }

.product-body {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-category {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.product-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  text-decoration: none;
  transition: color 0.2s;
  line-height: 1.3;
}

.product-name:hover { color: var(--color-primary); }

.product-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-specs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 20px;
  padding: 12px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
}

.spec-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.spec-key {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.spec-value {
  color: var(--color-text);
  font-weight: 500;
  text-align: right;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 8px;
}

.product-price {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-accent);
}

.empty-icon {
  color: var(--color-text-muted);
  margin-bottom: 16px;
  opacity: 0.5;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .product-card {
    grid-template-columns: 1fr;
  }
  .product-image {
    aspect-ratio: 16/9;
    border-right: none;
    border-bottom: 1px solid var(--color-border-light);
  }
  .product-body { padding: 18px; }
  .product-name { font-size: 17px; }
  .product-specs { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .product-card:hover .product-image img { transform: none; }
}
</style>
