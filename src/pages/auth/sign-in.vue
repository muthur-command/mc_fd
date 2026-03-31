<script setup lang="ts">
import ToggleTheme from '@/components/toggle-theme.vue'

import AuthTitle from './components/auth-title.vue'
import LoginForm from './components/login-form.vue'
</script>

<template>
  <div class="relative flex items-center justify-center min-h-screen p-4 min-w-screen">
    <div class="absolute right-4 top-4">
      <ToggleTheme />
    </div>
    <main class="flex flex-col gap-4">
      <AuthTitle />
      <LoginForm />
    </main>
  </div>
</template>
