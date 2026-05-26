<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const socialLinks = [
  {
    href: 'https://nextjs.org',
    labelKey: 'labelAbout',
    type: 'about' as const,
  },
  {
    href: 'https://notion.so',
    labelKey: 'labelGithub',
    mask: '/static/images/github.svg',
    altKey: 'altGithub',
  },
  {
    href: 'https://resend.com',
    labelKey: 'labelWechat',
    mask: '/static/images/wechat.svg',
    altKey: 'altWechat',
  },
  {
    href: 'https://www.android.com',
    labelKey: 'labelAndroid',
    mask: '/static/images/android.svg',
    altKey: 'altAndroid',
  },
  {
    href: 'https://simpleicons.org',
    mask: '/static/images/ios.svg',
    altKey: 'altIos',
    iconOnly: true,
  },
  {
    href: 'https://discord.com',
    labelKey: 'labelDiscord',
    mask: '/static/images/discord.svg',
    altKey: 'altDiscord',
  },
]
</script>

<template>
  <section class="logos">
    <h2>{{ t('socialTitle') }}</h2>
    <p>{{ t('socialDesc') }}</p>
    <div class="logo-grid">
      <a
        v-for="(link, index) in socialLinks"
        :key="index"
        class="logo-card"
        :href="link.href"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="link.altKey ? t(link.altKey) : undefined"
      >
        <span class="logo-card-label" :class="{ 'logo-card-icon-only': link.iconOnly }">
          <svg
            v-if="link.type === 'about'"
            class="badge-info-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 3 9.9 4.5 7.3 4.3 6.5 6.9 4.3 8.5 5 11 4.3 13.5 6.5 15.1 7.3 17.7 9.9 17.5 12 19 14.1 17.5 16.7 17.7 17.5 15.1 19.7 13.5 19 11 19.7 8.5 17.5 6.9 16.7 4.3 14.1 4.5Z" transform="translate(0 1)" />
            <path d="M12 8.75h.01" />
            <path d="M11.25 11.25h1.5v4h-1.5z" />
          </svg>
          <span
            v-else-if="link.mask"
            class="logo-card-img-mask"
            role="img"
            :aria-label="t(link.altKey!)"
            :style="{ '--logo-mask': `url(${link.mask})` }"
          />
          <span v-if="link.labelKey">{{ t(link.labelKey) }}</span>
        </span>
      </a>
    </div>
  </section>
</template>
