<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <!-- Brand -->
        <div class="footer-col footer-brand">
          <div class="logo">
            <span class="logo-icon">◆</span>
            <span class="logo-text">TradePlus</span>
          </div>
          <p class="footer-tagline">{{ t('footer.tagline') }}</p>
          <div class="footer-social">
            <a href="#" class="social-link" aria-label="LinkedIn">in</a>
            <a href="#" class="social-link" aria-label="YouTube">▶</a>
            <a href="#" class="social-link" aria-label="WhatsApp">✆</a>
          </div>
        </div>

        <!-- Products -->
        <div class="footer-col">
          <h4 class="footer-heading">{{ t('footer.products') }}</h4>
          <a href="/products?category=1">{{ t('footer.mixed_counters') }}</a>
          <a href="/products?category=2">{{ t('footer.currency_sorters') }}</a>
          <a href="/products?category=3">{{ t('footer.counterfeit_detectors') }}</a>
          <a href="/products?category=4">{{ t('footer.portable_counters') }}</a>
          <a href="/products?category=5">{{ t('footer.banking_equipment') }}</a>
        </div>

        <!-- Company -->
        <div class="footer-col">
          <h4 class="footer-heading">{{ t('footer.company') }}</h4>
          <router-link to="/about">{{ t('nav.about') }}</router-link>
          <router-link to="/news">{{ t('nav.news') }}</router-link>
          <router-link to="/contact">{{ t('nav.contact') }}</router-link>
          <a href="#">{{ t('footer.careers') }}</a>
        </div>

        <!-- Contact -->
        <div class="footer-col">
          <h4 class="footer-heading">{{ t('footer.contact') }}</h4>
          <p class="footer-contact-item">✉ {{ t('footer.email_placeholder') }}</p>
          <p class="footer-contact-item">✆ {{ t('footer.phone_placeholder') }}</p>
          <p class="footer-contact-item">⌂ {{ t('footer.address_placeholder') }}</p>
          <router-link to="/contact" class="footer-cta-link">{{ t('footer.send_inquiry') }} →</router-link>
        </div>
      </div>

      <div class="footer-bottom">
        <p>{{ t('footer.copyright') }}</p>
        <div class="footer-bottom-links">
          <a href="#">{{ t('footer.privacy') }}</a>
          <a href="#">{{ t('footer.terms') }}</a>
        </div>
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
  background: #0f1a2e;
  color: rgba(255, 255, 255, 0.7);
  padding: 72px 0 0;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
  gap: 48px;
  padding-bottom: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-brand .logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.logo-icon {
  font-size: 22px;
  color: var(--color-primary);
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.footer-tagline {
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.6;
  margin-bottom: 4px;
}

.footer-social {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.social-link {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  transition: all 0.2s;
  text-decoration: none;
}

.social-link:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(74, 158, 255, 0.1);
}

.footer-heading {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.footer-col a {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.55);
  transition: color 0.2s;
  text-decoration: none;
}

.footer-col a:hover {
  color: var(--color-primary);
}

.footer-contact-item {
  font-size: 13px;
  opacity: 0.5;
}

.footer-cta-link {
  color: var(--color-primary) !important;
  font-weight: 500;
  margin-top: 4px;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
}

.footer-bottom p {
  font-size: 13px;
  opacity: 0.4;
}

.footer-bottom-links {
  display: flex;
  gap: 24px;
}

.footer-bottom-links a {
  font-size: 13px;
  opacity: 0.4;
  transition: opacity 0.2s;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.7);
}

.footer-bottom-links a:hover {
  opacity: 0.7;
}

@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }

  .footer-bottom {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
</style>
