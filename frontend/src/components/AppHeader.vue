<template>
  <header class="header" :class="{ scrolled: isScrolled }">
    <div class="container header-inner">
      <router-link to="/" class="logo">
        <span class="logo-icon">◆</span>
        <span class="logo-text">TradePlus</span>
      </router-link>

      <nav class="nav" :class="{ open: menuOpen }">
        <router-link to="/" class="nav-link" @click="menuOpen = false">{{ t('nav.home') }}</router-link>
        <router-link to="/products" class="nav-link" @click="menuOpen = false">{{ t('nav.products') }}</router-link>
        <router-link to="/news" class="nav-link" @click="menuOpen = false">{{ t('nav.news') }}</router-link>
        <router-link to="/about" class="nav-link" @click="menuOpen = false">{{ t('nav.about') }}</router-link>
        <router-link to="/contact" class="nav-link" @click="menuOpen = false">{{ t('nav.contact') }}</router-link>
      </nav>

      <div class="header-actions">
        <button class="lang-toggle" @click="toggleLang" :title="locale === 'en' ? '切换中文' : 'Switch to English'">
          {{ locale === 'en' ? '中' : 'EN' }}
        </button>
        <button class="menu-toggle" @click="menuOpen = !menuOpen">
          <span :class="{ active: menuOpen }"></span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const isScrolled = ref(false)
const menuOpen = ref(false)

function toggleLang() {
  locale.value = locale.value === 'en' ? 'zh' : 'en'
}

function handleScroll() {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => window.addEventListener('scroll', handleScroll))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 20px 0;
  transition: all 0.3s;
}

.header.scrolled {
  padding: 12px 0;
  background: rgba(10, 15, 26, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.logo-icon {
  font-size: 24px;
  color: var(--color-primary);
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-white);
  letter-spacing: -0.5px;
}

.nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 8px 18px;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s;
  text-decoration: none;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--color-white);
  background: rgba(255, 255, 255, 0.05);
}

.nav-link.router-link-exact-active {
  color: var(--color-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lang-toggle {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-toggle:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.menu-toggle {
  display: none;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  cursor: pointer;
  position: relative;
}

.menu-toggle span,
.menu-toggle span::before,
.menu-toggle span::after {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--color-white);
  transition: all 0.3s;
  position: absolute;
  left: 8px;
}

.menu-toggle span { top: 17px; }
.menu-toggle span::before { content: ''; top: -6px; }
.menu-toggle span::after { content: ''; top: 6px; }

.menu-toggle span.active { background: transparent; }
.menu-toggle span.active::before { top: 0; transform: rotate(45deg); }
.menu-toggle span.active::after { top: 0; transform: rotate(-45deg); }

@media (max-width: 768px) {
  .menu-toggle { display: block; }

  .nav {
    position: fixed;
    top: 0;
    right: -100%;
    width: 260px;
    height: 100vh;
    background: #1a2744;
    flex-direction: column;
    padding: 80px 24px 24px;
    transition: right 0.3s;
    gap: 4px;
  }

  .nav.open { right: 0; }

  .nav-link {
    padding: 14px 16px;
    font-size: 16px;
  }
}
</style>
