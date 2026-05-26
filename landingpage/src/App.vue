<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InstallCard from '@/components/InstallCard.vue'
import SocialSection from '@/components/SocialSection.vue'
import TopBar from '@/components/TopBar.vue'
import { useParticlesCanvas } from '@/composables/useParticlesCanvas'

const { t } = useI18n()
const canvasRef = ref<HTMLCanvasElement | null>(null)

useParticlesCanvas(canvasRef)
</script>

<template>
  <canvas id="particles" ref="canvasRef" aria-hidden="true" />
  <TopBar />

  <main class="page">
    <section class="container">
      <p class="badge">
        {{ t('badge') }}
      </p>
      <img
        class="hero-logo"
        src="/static/images/logo.svg"
        :alt="t('heroLogoAlt')"
      >
      <h1>{{ t('heroTitle') }}</h1>
      <p class="subtitle">
        {{ t('heroSubtitle') }}
      </p>
      <InstallCard />
    </section>

    <SocialSection />
  </main>

  <footer>
    {{ t('footerBefore') }}
    <a
      href="https://www.muthur-command.com"
      target="_blank"
      rel="noopener noreferrer"
    >Muthur Command</a>{{ t('footerAfter') }}
  </footer>
</template>
