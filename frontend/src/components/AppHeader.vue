<template>
  <header class="header" :class="{ scrolled: isScrolled }">
    <div class="container header-inner">
      <router-link to="/" class="logo">
        <SvgIcon name="diamond" :size="28" class="logo-icon" />
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
        <button class="lang-toggle" @click="toggleLang" :aria-label="locale === 'en' ? '切换中文' : 'Switch to English'">
          {{ locale === 'en' ? '中' : 'EN' }}
        </button>
        <button class="menu-toggle" @click="menuOpen = !menuOpen" :aria-label="menuOpen ? 'Close menu' : 'Open menu'">
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

onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-header);
  padding: 18px 0;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid transparent;
}

.header.scrolled {
  padding: 12px 0;
  border-bottom-color: var(--color-border-light);
  box-shadow: var(--shadow-header-scrolled);
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
  color: var(--color-primary);
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.5px;
}

.nav {
  display: flex;
  gap: 4px;
}

.nav-link {
  padding: 8px 16px;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius);
  transition: all 0.2s;
  text-decoration: none;
  cursor: pointer;
}

.nav-link:hover {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.nav-link.router-link-exact-active {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lang-toggle {
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-toggle:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.menu-toggle {
  display: none;
  width: 44px;
  height: 44px;
  border: none;
  background: none;
  cursor: pointer;
  position: relative;
  border-radius: var(--radius-sm);
}

.menu-toggle:hover {
  background: var(--color-bg-alt);
}

.menu-toggle span,
.menu-toggle span::before,
.menu-toggle span::after {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--color-text);
  border-radius: 2px;
  transition: all 0.3s;
  position: absolute;
  left: 12px;
}

.menu-toggle span { top: 21px; }
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
    width: 280px;
    height: 100vh;
    background: var(--color-bg);
    flex-direction: column;
    padding: 80px 24px 24px;
    transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    gap: 2px;
    box-shadow: -4px 0 24px rgba(0,0,0,0.08);
  }

  .nav.open { right: 0; }

  .nav-link {
    padding: 14px 16px;
    font-size: 16px;
  }
}
</style>
