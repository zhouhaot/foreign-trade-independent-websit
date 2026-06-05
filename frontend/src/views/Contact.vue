<template>
  <div class="contact-page">
    <section class="page-hero">
      <div class="container">
        <h1 class="page-title fade-in-up">{{ t('contact.title') }}</h1>
        <p class="page-subtitle fade-in-up fade-in-up-delay-1">{{ t('contact.subtitle') }}</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="contact-layout">
          <!-- Form -->
          <div class="contact-form-wrapper fade-in-up">
            <div v-if="submitted" class="success-card">
              <div class="success-icon">
                <SvgIcon name="check" :size="28" />
              </div>
              <h2>{{ t('contact.success_title') }}</h2>
              <p>{{ t('contact.success_msg') }}</p>
              <button class="btn btn-outline" @click="resetForm">{{ t('contact.send_another') }}</button>
            </div>

            <form v-else @submit.prevent="submitForm" class="contact-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="contact-name">{{ t('contact.form_name') }}</label>
                  <input id="contact-name" type="text" v-model="form.contactName" required placeholder="John Doe">
                </div>
                <div class="form-group">
                  <label for="contact-email">{{ t('contact.form_email') }}</label>
                  <input id="contact-email" type="email" v-model="form.email" required placeholder="john@company.com">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="contact-phone">{{ t('contact.form_phone') }}</label>
                  <input id="contact-phone" type="tel" v-model="form.phone" placeholder="+86 138-0000-0000">
                </div>
                <div class="form-group">
                  <label for="contact-company">{{ t('contact.form_company') }}</label>
                  <input id="contact-company" type="text" v-model="form.companyName" placeholder="Company Ltd.">
                </div>
              </div>
              <div class="form-group">
                <label for="contact-message">{{ t('contact.form_message') }}</label>
                <textarea id="contact-message" v-model="form.message" rows="5" required :placeholder="locale === 'zh' ? '请描述您的需求...' : 'Please describe your requirements...'"></textarea>
              </div>
              <div class="form-footer">
                <button type="submit" class="btn btn-primary btn-lg" :disabled="sending">
                  {{ sending ? t('contact.form_sending') : t('contact.form_submit') }}
                </button>
                <span class="form-trust">
                  <SvgIcon name="lock" :size="14" class="trust-icon" />
                  {{ locale === 'zh' ? '您的信息将被严格保密' : 'Your information is secure' }}
                </span>
              </div>
            </form>
          </div>

          <!-- Contact Info Sidebar -->
          <div class="contact-sidebar fade-in-up fade-in-up-delay-2">
            <div class="contact-info-card">
              <h3>{{ t('contact.info_title') }}</h3>
              <div class="info-items">
                <div class="info-item">
                  <div class="info-icon">
                    <SvgIcon name="mail" :size="20" />
                  </div>
                  <div>
                    <div class="info-label">{{ t('contact.info_email') }}</div>
                    <div class="info-value">info@tradeplus.com</div>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-icon">
                    <SvgIcon name="phone" :size="20" />
                  </div>
                  <div>
                    <div class="info-label">{{ t('contact.info_phone') }}</div>
                    <div class="info-value">+86 400-888-8888</div>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-icon">
                    <SvgIcon name="mapPin" :size="20" />
                  </div>
                  <div>
                    <div class="info-label">{{ t('contact.info_address') }}</div>
                    <div class="info-value">{{ t('contact.info_address_value') }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Trust Badges -->
            <div class="trust-badges">
              <div class="trust-badge">
                <span class="trust-badge-icon">
                  <SvgIcon name="shield" :size="16" />
                </span>
                <div>
                  <div class="trust-badge-title">{{ t('home.why_quality') }}</div>
                  <div class="trust-badge-desc">{{ t('home.why_quality_desc') }}</div>
                </div>
              </div>
              <div class="trust-badge">
                <span class="trust-badge-icon">
                  <SvgIcon name="globe" :size="16" />
                </span>
                <div>
                  <div class="trust-badge-title">{{ t('home.why_delivery') }}</div>
                  <div class="trust-badge-desc">{{ t('home.why_delivery_desc') }}</div>
                </div>
              </div>
              <div class="trust-badge">
                <span class="trust-badge-icon">
                  <SvgIcon name="clock" :size="16" />
                </span>
                <div>
                  <div class="trust-badge-title">{{ t('home.why_support') }}</div>
                  <div class="trust-badge-desc">{{ t('home.why_support_desc') }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '../api'

const { t, locale } = useI18n()
const route = useRoute()
const sending = ref(false)
const submitted = ref(false)

const form = ref({
  contactName: '',
  email: '',
  phone: '',
  companyName: '',
  productId: null,
  message: ''
})

onMounted(() => {
  if (route.query.product) {
    form.value.productId = parseInt(route.query.product)
  }
})

async function submitForm() {
  sending.value = true
  try {
    await api.submitInquiry(form.value)
    submitted.value = true
  } catch (e) {
    alert('Failed to submit. Please try again.')
    console.error(e)
  } finally {
    sending.value = false
  }
}

function resetForm() {
  form.value = { contactName: '', email: '', phone: '', companyName: '', productId: null, message: '' }
  submitted.value = false
}
</script>

<style scoped>
/* ===== Layout ===== */
.contact-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 48px;
  align-items: start;
}

/* ===== Form ===== */
.contact-form-wrapper {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 36px;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.form-group input,
.form-group textarea {
  padding: 12px 14px;
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.25s, box-shadow 0.25s;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: var(--color-text-muted);
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-glow);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.form-footer {
  display: flex;
  align-items: center;
  gap: 20px;
}

.form-footer .btn-lg {
  padding: 14px 36px;
  font-size: 16px;
}

.form-trust {
  font-size: 13px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.trust-icon {
  flex-shrink: 0;
  color: var(--color-success);
}

/* ===== Success Card ===== */
.success-card {
  text-align: center;
  padding: 40px 24px;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-success-light);
  color: var(--color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.success-card h2 {
  color: var(--color-text);
  font-size: 22px;
  margin-bottom: 10px;
}

.success-card p {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
  line-height: 1.6;
}

/* ===== Contact Info Sidebar ===== */
.contact-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.contact-info-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 28px;
}

.contact-info-card h3 {
  color: var(--color-text);
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
}

.info-items {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.info-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 2px;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
}

/* ===== Trust Badges ===== */
.trust-badges {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trust-badge {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius);
  padding: 18px;
  transition: all var(--transition);
  cursor: pointer;
}

.trust-badge:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card);
}

.trust-badge-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--color-success-light);
  color: var(--color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.trust-badge-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 2px;
}

.trust-badge-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .contact-layout { grid-template-columns: 1fr; gap: 32px; }
  .form-row { grid-template-columns: 1fr; }
  .contact-form-wrapper { padding: 24px; }
  .form-footer { flex-direction: column; align-items: stretch; }
  .form-footer .btn-lg { text-align: center; }
}
</style>
