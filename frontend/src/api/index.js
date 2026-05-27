import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default {
  getCategories() {
    return api.get('/categories')
  },
  getProducts(categoryId) {
    const params = categoryId ? { categoryId } : {}
    return api.get('/products', { params })
  },
  getFeaturedProducts(limit = 8) {
    return api.get('/products/featured', { params: { limit } })
  },
  getProduct(id) {
    return api.get(`/products/${id}`)
  },
  submitInquiry(data) {
    return api.post('/inquiries', data)
  }
}
