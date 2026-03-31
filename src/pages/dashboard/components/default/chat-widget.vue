<script setup lang="ts">
import { Check, Plus, Send } from 'lucide-vue-next'

import { cn } from '@/lib/utils'

interface User {
  name: string
  email: string
  avatar: string
}

const users: User[] = [
  { name: 'Olivia Martin', email: 'm@example.com', avatar: 'https://bundui-images.netlify.app/avatars/01.png' },
  { name: 'Isabella Nguyen', email: 'isabella.nguyen@email.com', avatar: 'https://bundui-images.netlify.app/avatars/07.png' },
  { name: 'Emma Wilson', email: 'emma@example.com', avatar: 'https://bundui-images.netlify.app/avatars/02.png' },
  { name: 'Jackson Lee', email: 'lee@example.com', avatar: 'https://bundui-images.netlify.app/avatars/09.png' },
  { name: 'William Kim', email: 'will@email.com', avatar: 'https://bundui-images.netlify.app/avatars/06.png' },
]

const open = ref(false)
const selectedUsers = ref<User[]>([])
const messages = ref([
  { role: 'agent', content: 'Hi, how can I help you today?' },
  { role: 'user', content: 'Hey, I\'m having trouble with my account.' },
  { role: 'agent', content: 'What seems to be the problem?' },
  { role: 'user', content: 'I can\'t log in.' },
])
const input = ref('')
const inputLength = computed(() => input.value.trim().length)

function send() {
  if (inputLength.value === 0)
    return
  messages.value.push({ role: 'user', content: input.value })
  input.value = ''
}

function toggleUser(user: User) {
  if (selectedUsers.value.some(u => u.email === user.email)) {
    selectedUsers.value = selectedUsers.value.filter(u => u.email !== user.email)
  }
  else {
    selectedUsers.value = [...selectedUsers.value, user]
  }
}
</script>

<template>
  <UiCard>
    <UiCardHeader class="flex flex-row items-center">
      <div class="flex items-center space-x-4">
        <UiAvatar>
          <UiAvatarImage src="https://bundui-images.netlify.app/avatars/04.png" />
          <UiAvatarFallback>OM</UiAvatarFallback>
        </UiAvatar>
        <div>
          <p class="text-sm font-medium leading-none">
            Sofia Davis
          </p>
          <p class="text-sm text-muted-foreground">
            m@example.com
          </p>
        </div>
      </div>
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <UiButton size="icon" variant="outline" class="ml-auto rounded-full" @click="open = true">
            <Plus />
            <span class="sr-only">New message</span>
          </UiButton>
        </UiTooltipTrigger>
        <UiTooltipContent :side-offset="10">
          New message
        </UiTooltipContent>
      </UiTooltip>
    </UiCardHeader>
    <UiCardContent>
      <div class="space-y-4">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="cn(
            'flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm',
            message.role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted',
          )"
        >
          {{ message.content }}
        </div>
      </div>
    </UiCardContent>
    <UiCardFooter>
      <form class="flex w-full items-center space-x-2" @submit.prevent="send">
        <UiInput
          id="message"
          v-model="input"
          placeholder="Type your message..."
          class="flex-1"
          autocomplete="off"
        />
        <UiButton type="submit" size="icon" :disabled="inputLength === 0">
          <Send class="h-4 w-4" />
          <span class="sr-only">Send</span>
        </UiButton>
      </form>
    </UiCardFooter>
  </UiCard>

  <UiDialog v-model:open="open">
    <UiDialogContent class="gap-0 p-0 outline-hidden">
      <UiDialogHeader class="px-4 pt-5 pb-4">
        <UiDialogTitle>New message</UiDialogTitle>
        <UiDialogDescription>
          Invite a user to this thread. This will create a new group message.
        </UiDialogDescription>
      </UiDialogHeader>
      <UiCommand class="overflow-hidden rounded-t-none border-t">
        <UiCommandInput placeholder="Search user..." />
        <UiCommandList>
          <UiCommandEmpty>No users found.</UiCommandEmpty>
          <UiCommandGroup class="p-2">
            <UiCommandItem
              v-for="user in users"
              :key="user.email"
              :value="user.email"
              class="flex items-center p-2"
              @select="toggleUser(user)"
            >
              <UiAvatar>
                <UiAvatarImage :src="user.avatar" alt="Image" />
                <UiAvatarFallback>{{ user.name[0] }}</UiAvatarFallback>
              </UiAvatar>
              <div class="ml-2">
                <p class="text-sm font-medium leading-none">
                  {{ user.name }}
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ user.email }}
                </p>
              </div>
              <Check v-if="selectedUsers.some((u: User) => u.email === user.email)" class="ml-auto flex h-5 w-5 text-primary" />
            </UiCommandItem>
          </UiCommandGroup>
        </UiCommandList>
      </UiCommand>
      <UiDialogFooter class="flex items-center border-t p-4 sm:justify-between">
        <div v-if="selectedUsers.length > 0" class="flex -space-x-2 overflow-hidden">
          <UiAvatar
            v-for="user in selectedUsers"
            :key="user.email"
            class="inline-block border-2 border-background"
          >
            <UiAvatarImage :src="user.avatar" />
            <UiAvatarFallback>{{ user.name[0] }}</UiAvatarFallback>
          </UiAvatar>
        </div>
        <p v-else class="text-sm text-muted-foreground">
          Select users to add to this thread.
        </p>
        <UiButton :disabled="selectedUsers.length < 2" @click="open = false">
          Continue
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
