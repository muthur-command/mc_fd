<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useInstallStatus } from '@/composables/useInstallStatus'

const { t } = useI18n()
const {
  progress,
  detailsVisible,
  failed,
  logText,
  detailsToggleLabel,
  toggleDetails,
  showFailureDetails,
  retryInstall,
  downloadLogs,
} = useInstallStatus()
</script>

<template>
  <div class="install-card">
    <div class="progress">
      <div class="bar" :style="{ width: `${progress}%` }" />
    </div>
    <div class="status-actions">
      <button class="btn-link" type="button" @click="toggleDetails">
        {{ detailsToggleLabel }}
      </button>
      <a
        class="icon-download"
        href="#"
        :aria-label="t('downloadLogsAria')"
        @click.prevent="downloadLogs"
      >⬇</a>
    </div>
    <div class="details-panel" :class="{ hidden: !detailsVisible }">
      {{ logText }}
    </div>
    <div class="failure-panel" :class="{ show: failed }">
      <div class="failure-title">
        {{ t('installFailureTitle') }}
      </div>
      <div>{{ t('installFailureMessage') }}</div>
      <div class="failure-actions">
        <button class="btn-sm primary" type="button" @click="retryInstall">
          {{ t('retryInstall') }}
        </button>
        <button class="btn-sm" type="button" @click="showFailureDetails">
          {{ t('showFailureDetails') }}
        </button>
      </div>
    </div>
  </div>
</template>
