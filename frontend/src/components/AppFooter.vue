<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <!-- Brand -->
        <div class="footer-col footer-brand">
          <div class="logo">
            <SvgIcon name="diamond" :size="24" class="logo-icon" />
            <span class="logo-text">TradePlus</span>
          </div>
          <p class="footer-tagline">{{ t('footer.tagline') }}</p>
          <div class="footer-social">
            <a href="#" class="social-link" aria-label="LinkedIn">
              <SvgIcon name="linkedin" :size="16" />
            </a>
            <a href="#" class="social-link" aria-label="YouTube">
              <SvgIcon name="youtube" :size="16" />
            </a>
            <a href="#" class="social-link" aria-label="WhatsApp">
              <SvgIcon name="whatsapp" :size="16" />
            </a>
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
          <div class="footer-contact-item">
            <SvgIcon name="mail" :size="14" class="contact-icon" />
            <span>{{ t('footer.email_placeholder') }}</span>
          </div>
          <div class="footer-contact-item">
            <SvgIcon name="phone" :size="14" class="contact-icon" />
            <span>{{ t('footer.phone_placeholder') }}</span>
          </div>
          <div class="footer-contact-item">
            <SvgIcon name="mapPin" :size="14" class="contact-icon" />
            <span>{{ t('footer.address_placeholder') }}</span>
          </div>
          <router-link to="/contact" class="footer-cta-link">{{ t('footer.send_inquiry') }} <SvgIcon name="arrowRight" :size="14" /></router-link>
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
  background: #0f172a;
  color: rgba(255, 255, 255, 0.65);
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
  color: #60a5fa;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.footer-tagline {
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.5;
  margin-bottom: 4px;
}

.footer-social {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.social-link {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.45);
  transition: all 0.2s;
  text-decoration: none;
  cursor: pointer;
}

.social-link:hover {
  border-color: #60a5fa;
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
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
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.2s;
  text-decoration: none;
  cursor: pointer;
}

.footer-col a:hover {
  color: #60a5fa;
}

.footer-contact-item {
  font-size: 13px;
  opacity: 0.6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.contact-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.footer-cta-link {
  color: #60a5fa !important;
  font-weight: 500;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
}

.footer-bottom p {
  font-size: 13px;
  opacity: 0.35;
}

.footer-bottom-links {
  display: flex;
  gap: 24px;
}

.footer-bottom-links a {
  font-size: 13px;
  opacity: 0.35;
  transition: opacity 0.2s;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
}

.footer-bottom-links a:hover {
  opacity: 0.65;
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
