<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-inner">
        <div class="footer-brand">
          <div class="logo">
            <span class="logo-icon">◆</span>
            <span class="logo-text">TradePlus</span>
          </div>
          <p class="footer-tagline">{{ t('footer.tagline') }}</p>
        </div>
        <div class="footer-links">
          <router-link to="/">{{ t('nav.home') }}</router-link>
          <router-link to="/products">{{ t('nav.products') }}</router-link>
          <router-link to="/about">{{ t('nav.about') }}</router-link>
          <router-link to="/contact">{{ t('nav.contact') }}</router-link>
        </div>
      </div>
      <div class="footer-bottom">
        <p>{{ t('footer.copyright') }}</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<style scoped>
.footer {
  background: #060a14;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 60px 0 24px;
}

.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 40px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.footer-brand .logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.logo-icon {
  font-size: 20px;
  color: var(--color-primary);
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-white);
}

.footer-tagline {
  color: var(--color-text-muted);
  font-size: 14px;
}

.footer-links {
  display: flex;
  gap: 32px;
}

.footer-links a {
  color: var(--color-text-secondary);
  font-size: 14px;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: var(--color-primary);
}

.footer-bottom {
  padding-top: 24px;
  text-align: center;
}

.footer-bottom p {
  color: var(--color-text-muted);
  font-size: 13px;
}

@media (max-width: 768px) {
  .footer-inner {
    flex-direction: column;
    gap: 24px;
  }

  .footer-links {
    gap: 20px;
    flex-wrap: wrap;
  }
}
</style>
