<script lang="ts" setup>
import { Download, RotateCcw, Upload } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import type { InstalledThemePackage } from './types'

import ThemeLayout from './components/theme-layout.vue'
import { themePackageManager, themePackageUtils } from './manager'

const { t } = useI18n()
const loading = ref(false)
const uploadOpen = ref(false)
const uploadFile = ref<File | null>(null)
const resetOpen = ref(false)

const installedThemes = computed(() => themePackageManager.getInstalledPackages())
const currentTheme = computed(() => themePackageManager.getCurrentThemePackage())
const customThemes = computed(() => installedThemes.value.filter(t => t.type === 'custom'))

function getThemePreview(theme: InstalledThemePackage) {
  if (theme.config?.metadata?.preview)
    return theme.config.metadata.preview
  return themePackageUtils.generatePreview(theme.config?.colors ?? { primary: '#0d9488' })
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  uploadFile.value = target.files?.[0] ?? null
}

async function handleUpload() {
  if (!uploadFile.value) {
    toast.error(t('pluginTheme.toast.selectFile'))
    return
  }
  loading.value = true
  try {
    await themePackageManager.loadFromFile(uploadFile.value, { autoApply: false, saveToStorage: true })
    toast.success(t('pluginTheme.toast.installSuccess'))
    uploadOpen.value = false
    uploadFile.value = null
  }
  catch (err: any) {
    toast.error(err?.message ?? t('pluginTheme.toast.installFailed'))
  }
  finally {
    loading.value = false
  }
}

async function applyTheme(theme: InstalledThemePackage) {
  loading.value = true
  try {
    await themePackageManager.applyTheme(theme.id)
    toast.success(t('pluginTheme.toast.applySuccess', { name: theme.name }))
  }
  catch (err: any) {
    toast.error(err?.message ?? t('pluginTheme.toast.applyFailed'))
  }
  finally {
    loading.value = false
  }
}

function confirmRemove(theme: InstalledThemePackage) {
  try {
    themePackageManager.removeTheme(theme.id)
    toast.success(t('pluginTheme.toast.removeSuccess'))
  }
  catch (err: any) {
    toast.error(err?.message ?? t('pluginTheme.toast.removeFailed'))
  }
}

function confirmReset() {
  try {
    themePackageManager.resetToDefault()
    toast.success(t('pluginTheme.toast.resetSuccess'))
    resetOpen.value = false
  }
  catch (err: any) {
    toast.error(err?.message ?? t('pluginTheme.toast.resetFailed'))
  }
}

async function exportTheme(theme: InstalledThemePackage) {
  loading.value = true
  try {
    const blob = await themePackageManager.exportTheme(theme.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${theme.name}-${theme.version}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t('pluginTheme.toast.exportSuccess'))
  }
  catch (err: any) {
    toast.error(err?.message ?? t('pluginTheme.toast.exportFailed'))
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <ThemeLayout
    :title="t('pluginTheme.storeTitle')"
    :description="t('pluginTheme.storeDesc')"
  >
    <template #actions>
      <UiButton variant="outline" @click="uploadOpen = true">
        <Upload class="size-4" />
        {{ t('pluginTheme.importTheme') }}
      </UiButton>
      <UiButton variant="outline" @click="resetOpen = true">
        <RotateCcw class="size-4" />
        {{ t('pluginTheme.resetDefault') }}
      </UiButton>
    </template>

    <div class="space-y-6">
      <!-- 当前主题 -->
      <UiCard v-if="currentTheme">
        <UiCardHeader>
          <UiCardTitle>{{ t('pluginTheme.currentTheme') }}</UiCardTitle>
          <UiCardDescription>
            {{ currentTheme.description || t('pluginTheme.noDescription') }}
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div class="h-24 w-40 shrink-0 overflow-hidden rounded-lg border">
            <img :src="getThemePreview(currentTheme)" :alt="currentTheme.name" class="h-full w-full object-cover">
          </div>
          <div class="min-w-0 flex-1 space-y-1">
            <p class="font-medium">
              {{ currentTheme.name }}
            </p>
            <p class="text-muted-foreground text-sm">
              v{{ currentTheme.version }}
              <span v-if="currentTheme.author" class="ml-2">· {{ currentTheme.author }}</span>
            </p>
            <div class="flex flex-wrap gap-1 pt-2">
              <span
                v-if="currentTheme.config?.colors?.primary"
                class="inline-block size-5 rounded-full border"
                :style="{ backgroundColor: currentTheme.config.colors.primary }"
                :title="t('pluginTheme.colorPrimary')"
              />
              <span
                v-if="currentTheme.config?.colors?.success"
                class="inline-block size-5 rounded-full border"
                :style="{ backgroundColor: currentTheme.config.colors.success }"
                :title="t('pluginTheme.colorSuccess')"
              />
              <span
                v-if="currentTheme.config?.colors?.destructive"
                class="inline-block size-5 rounded-full border"
                :style="{ backgroundColor: currentTheme.config.colors.destructive }"
                :title="t('pluginTheme.colorDestructive')"
              />
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- 自定义主题列表 -->
      <div v-if="customThemes.length > 0" class="space-y-4">
        <h2 class="text-lg font-semibold">
          {{ t('pluginTheme.customThemes') }}
        </h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <UiCard v-for="theme in customThemes" :key="theme.id" class="overflow-hidden">
            <div class="aspect-video w-full overflow-hidden bg-muted">
              <img :src="getThemePreview(theme)" :alt="theme.name" class="h-full w-full object-cover">
            </div>
            <UiCardHeader class="pb-2">
              <UiCardTitle class="text-base">
                {{ theme.name }}
              </UiCardTitle>
              <UiCardDescription class="line-clamp-2">
                {{ theme.description || t('pluginTheme.noDescription') }}
              </UiCardDescription>
            </UiCardHeader>
            <UiCardFooter class="flex flex-wrap gap-2">
              <UiButton
                v-if="!theme.isCurrent"
                size="sm"
                @click="applyTheme(theme)"
              >
                {{ t('pluginTheme.apply') }}
              </UiButton>
              <UiButton v-else size="sm" variant="secondary" disabled>
                {{ t('pluginTheme.applied') }}
              </UiButton>
              <UiButton size="sm" variant="outline" @click="exportTheme(theme)">
                <Download class="size-3" />
                {{ t('pluginTheme.export') }}
              </UiButton>
              <UiAlertDialog>
                <UiAlertDialogTrigger as-child>
                  <UiButton size="sm" variant="outline" class="text-destructive">
                    {{ t('pluginTheme.delete') }}
                  </UiButton>
                </UiAlertDialogTrigger>
                <UiAlertDialogContent>
                  <UiAlertDialogHeader>
                    <UiAlertDialogTitle>{{ t('pluginTheme.confirmDelete') }}</UiAlertDialogTitle>
                    <UiAlertDialogDescription>
                      {{ t('pluginTheme.confirmDeleteDesc', { name: theme.name }) }}
                    </UiAlertDialogDescription>
                  </UiAlertDialogHeader>
                  <UiAlertDialogFooter>
                    <UiAlertDialogCancel>{{ t('pluginTheme.cancel') }}</UiAlertDialogCancel>
                    <UiAlertDialogAction class="bg-destructive text-destructive-foreground" @click="confirmRemove(theme)">
                      {{ t('pluginTheme.delete') }}
                    </UiAlertDialogAction>
                  </UiAlertDialogFooter>
                </UiAlertDialogContent>
              </UiAlertDialog>
            </UiCardFooter>
          </UiCard>
        </div>
      </div>

      <!-- 空状态 -->
      <UiCard v-else class="border-dashed">
        <UiCardContent class="flex flex-col items-center justify-center py-12">
          <p class="text-muted-foreground text-center text-sm">
            {{ t('pluginTheme.emptyHint') }}
          </p>
          <UiButton class="mt-4" @click="uploadOpen = true">
            <Upload class="size-4" />
            {{ t('pluginTheme.importTheme') }}
          </UiButton>
        </UiCardContent>
      </UiCard>

      <!-- 导入对话框 -->
      <UiDialog v-model:open="uploadOpen">
        <UiDialogContent class="sm:max-w-md">
          <UiDialogHeader>
            <UiDialogTitle>{{ t('pluginTheme.importDialogTitle') }}</UiDialogTitle>
            <UiDialogDescription>
              {{ t('pluginTheme.importDialogDesc') }}
            </UiDialogDescription>
          </UiDialogHeader>
          <div class="grid gap-4 py-4">
            <div class="grid gap-2">
              <UiLabel for="theme-file">
                {{ t('pluginTheme.selectFile') }}
              </UiLabel>
              <input
                id="theme-file"
                type="file"
                accept=".json,.zip"
                class="file:border-primary file:bg-primary file:text-primary-foreground flex h-9 w-full rounded-md border border-input bg-transparent text-sm file:mr-2 file:rounded-md file:px-4 file:py-2 file:text-sm file:font-medium"
                @change="onFileChange"
              >
            </div>
          </div>
          <UiDialogFooter>
            <UiButton variant="outline" @click="uploadOpen = false">
              {{ t('pluginTheme.cancel') }}
            </UiButton>
            <UiButton :disabled="!uploadFile || loading" @click="handleUpload">
              {{ t('pluginTheme.import') }}
            </UiButton>
          </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>

      <!-- 重置确认 -->
      <AlertDialog v-model:open="resetOpen">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t('pluginTheme.confirmReset') }}</AlertDialogTitle>
            <AlertDialogDescription>
              {{ t('pluginTheme.confirmResetDesc') }}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{{ t('pluginTheme.cancel') }}</AlertDialogCancel>
            <AlertDialogAction @click="confirmReset">
              {{ t('pluginTheme.reset') }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </ThemeLayout>
</template>
