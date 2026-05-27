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
              <div class="success-icon">✓</div>
              <h2>{{ t('contact.success_title') }}</h2>
              <p>{{ t('contact.success_msg') }}</p>
              <button class="btn btn-outline" @click="resetForm">{{ t('contact.send_another') }}</button>
            </div>

            <form v-else @submit.prevent="submitForm" class="contact-form">
              <div class="form-row">
                <div class="form-group">
                  <label>{{ t('contact.form_name') }}</label>
                  <input type="text" v-model="form.contactName" required>
                </div>
                <div class="form-group">
                  <label>{{ t('contact.form_email') }}</label>
                  <input type="email" v-model="form.email" required>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ t('contact.form_phone') }}</label>
                  <input type="tel" v-model="form.phone">
                </div>
                <div class="form-group">
                  <label>{{ t('contact.form_company') }}</label>
                  <input type="text" v-model="form.companyName">
                </div>
              </div>
              <div class="form-group">
                <label>{{ t('contact.form_message') }}</label>
                <textarea v-model="form.message" rows="5" required></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-lg" :disabled="sending">
                {{ sending ? t('contact.form_sending') : t('contact.form_submit') }}
              </button>
            </form>
          </div>

          <!-- Contact Info -->
          <div class="contact-info fade-in-up fade-in-up-delay-2">
            <h3>{{ t('contact.info_title') }}</h3>
            <div class="info-items">
              <div class="info-item">
                <div class="info-icon">✉</div>
                <div>
                  <div class="info-label">{{ t('contact.info_email') }}</div>
                  <div class="info-value">info@tradeplus.com</div>
                </div>
              </div>
              <div class="info-item">
                <div class="info-icon">☎</div>
                <div>
                  <div class="info-label">{{ t('contact.info_phone') }}</div>
                  <div class="info-value">+86 400-888-8888</div>
                </div>
              </div>
              <div class="info-item">
                <div class="info-icon">◎</div>
                <div>
                  <div class="info-label">{{ t('contact.info_address') }}</div>
                  <div class="info-value">{{ t('contact.info_address_value') }}</div>
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

const { t } = useI18n()
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
.page-hero {
  padding: 140px 0 60px;
  text-align: center;
  background: radial-gradient(ellipse at 50% 0%, rgba(74, 158, 255, 0.08) 0%, transparent 60%);
}

.page-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--color-white);
  margin-bottom: 16px;
}

.page-subtitle {
  font-size: 18px;
  color: var(--color-text-secondary);
}

.contact-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 60px;
  align-items: start;
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
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.form-group input,
.form-group textarea {
  padding: 14px 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-white);
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--color-primary);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.btn-lg {
  padding: 16px 36px;
  font-size: 16px;
  align-self: flex-start;
}

.btn-lg:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.success-card {
  text-align: center;
  padding: 60px 40px;
  background: var(--color-bg-card);
  border: 1px solid rgba(46, 213, 115, 0.2);
  border-radius: 16px;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(46, 213, 115, 0.15);
  color: var(--color-success);
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.success-card h2 {
  color: var(--color-white);
  font-size: 24px;
  margin-bottom: 12px;
}

.success-card p {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.contact-info {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 32px;
}

.contact-info h3 {
  color: var(--color-white);
  font-size: 20px;
  margin-bottom: 24px;
}

.info-items {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.info-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(74, 158, 255, 0.1);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.info-label {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.info-value {
  font-size: 15px;
  color: var(--color-text);
}

@media (max-width: 768px) {
  .page-title { font-size: 32px; }
  .contact-layout { grid-template-columns: 1fr; gap: 32px; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
