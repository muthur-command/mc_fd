import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

export function useInstallStatus() {
  const { tm, t } = useI18n()

  const progress = ref(42)
  const detailsVisible = ref(false)
  const failed = ref(window.location.search.includes('fail=1'))
  const retryExtraCount = ref(0)

  const installLogs = computed(() => {
    const lines = [...(tm('installLogs') as string[])]
    if (retryExtraCount.value >= 1)
      lines.push(t('logRetry1'))
    if (retryExtraCount.value >= 2)
      lines.push(t('logRetry2'))
    return lines
  })

  const logText = computed(() => {
    const lines = failed.value
      ? [...installLogs.value, ...(tm('failureLogs') as string[])]
      : installLogs.value
    return lines.join('\n')
  })

  const detailsToggleLabel = computed(() =>
    detailsVisible.value ? t('installHideDetails') : t('installShowDetails'),
  )

  function toggleDetails() {
    detailsVisible.value = !detailsVisible.value
  }

  function showFailureDetails() {
    detailsVisible.value = true
  }

  function retryInstall() {
    failed.value = false
    progress.value = 56
    retryExtraCount.value = 2
  }

  function downloadLogs() {
    const blob = new Blob([`${logText.value}\n`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'muthur-command-install.log'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return {
    progress,
    detailsVisible,
    failed,
    logText,
    detailsToggleLabel,
    toggleDetails,
    showFailureDetails,
    retryInstall,
    downloadLogs,
  }
}
