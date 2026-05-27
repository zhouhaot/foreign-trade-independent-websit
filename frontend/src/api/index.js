import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default {
  // Banners
  getBanners() {
    return api.get('/banners')
  },
  // Categories
  getCategories() {
    return api.get('/categories')
  },
  // Products
  getProducts(categoryId, keyword) {
    const params = {}
    if (categoryId) params.categoryId = categoryId
    if (keyword) params.keyword = keyword
    return api.get('/products', { params })
  },
  getFeaturedProducts(limit = 8) {
    return api.get('/products/featured', { params: { limit } })
  },
  getProduct(id) {
    return api.get(`/products/${id}`)
  },
  // Articles
  getArticles(limit = 10) {
    return api.get('/articles', { params: { limit } })
  },
  getArticle(id) {
    return api.get(`/articles/${id}`)
  },
  // Inquiries
  submitInquiry(data) {
    return api.post('/inquiries', data)
  }
}
