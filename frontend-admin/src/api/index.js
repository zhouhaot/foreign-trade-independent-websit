import axios from 'axios'

const api = axios.create({
  baseURL: '/admin/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor: add Bearer token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/#/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const auth = {
  login(username, password) {
    return api.post('/auth/login', { username, password })
  }
}

// Dashboard
export const dashboard = {
  getStats() {
    return api.get('/dashboard/stats')
  }
}

// Products
export const products = {
  list(params) { return api.get('/products', { params }) },
  get(id) { return api.get(`/products/${id}`) },
  create(data) { return api.post('/products', data) },
  update(id, data) { return api.put(`/products/${id}`, data) },
  delete(id) { return api.delete(`/products/${id}`) }
}

// Categories
export const categories = {
  list() { return api.get('/categories') },
  get(id) { return api.get(`/categories/${id}`) },
  create(data) { return api.post('/categories', data) },
  update(id, data) { return api.put(`/categories/${id}`, data) },
  delete(id) { return api.delete(`/categories/${id}`) }
}

// Articles
export const articles = {
  list() { return api.get('/articles') },
  get(id) { return api.get(`/articles/${id}`) },
  create(data) { return api.post('/articles', data) },
  update(id, data) { return api.put(`/articles/${id}`, data) },
  delete(id) { return api.delete(`/articles/${id}`) }
}

// Banners
export const banners = {
  list() { return api.get('/banners') },
  get(id) { return api.get(`/banners/${id}`) },
  create(data) { return api.post('/banners', data) },
  update(id, data) { return api.put(`/banners/${id}`, data) },
  delete(id) { return api.delete(`/banners/${id}`) }
}

// Inquiries
export const inquiries = {
  list() { return api.get('/inquiries') },
  get(id) { return api.get(`/inquiries/${id}`) },
  markRead(id) { return api.put(`/inquiries/${id}/read`) },
  delete(id) { return api.delete(`/inquiries/${id}`) }
}

// Upload
export function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export default api
