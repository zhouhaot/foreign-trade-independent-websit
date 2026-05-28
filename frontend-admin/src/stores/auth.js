import { defineStore } from 'pinia'
import { auth } from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('admin_token') || '',
    username: localStorage.getItem('admin_username') || ''
  }),
  getters: {
    isLoggedIn: state => !!state.token
  },
  actions: {
    async login(username, password) {
      const res = await auth.login(username, password)
      const { token } = res.data.data
      this.token = token
      this.username = username
      localStorage.setItem('admin_token', token)
      localStorage.setItem('admin_username', username)
    },
    logout() {
      this.token = ''
      this.username = ''
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_username')
    }
  }
})
