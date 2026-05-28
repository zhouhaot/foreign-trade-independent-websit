import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/Login.vue')
  },
  {
    path: '/',
    component: () => import('../layout/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/Dashboard.vue'),
        meta: { title: 'Dashboard' }
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('../views/products/List.vue'),
        meta: { title: '产品管理' }
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('../views/categories/List.vue'),
        meta: { title: '分类管理' }
      },
      {
        path: 'articles',
        name: 'Articles',
        component: () => import('../views/articles/List.vue'),
        meta: { title: '文章管理' }
      },
      {
        path: 'banners',
        name: 'Banners',
        component: () => import('../views/banners/List.vue'),
        meta: { title: '轮播图管理' }
      },
      {
        path: 'inquiries',
        name: 'Inquiries',
        component: () => import('../views/inquiries/List.vue'),
        meta: { title: '询盘管理' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Auth guard
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.path !== '/login' && !auth.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && auth.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
