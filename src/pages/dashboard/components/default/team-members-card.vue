<script setup lang="ts">
import { Check, ChevronsDown } from 'lucide-vue-next'

const roles = [
  { id: 1, name: 'Viewer', description: 'Can view and comment.' },
  { id: 2, name: 'Developer', description: 'Can view, comment and edit.' },
  { id: 3, name: 'Billing', description: 'Can view, comment and manage billing.' },
  { id: 4, name: 'Owner', description: 'Admin-level access to all resources.' },
]

const initialMembers = [
  { id: 1, name: 'Toby Belhome', email: 'contact@bundui.io', avatar: 'https://bundui-images.netlify.app/avatars/01.png', role_id: 1 },
  { id: 2, name: 'Jackson Lee', email: 'pre@example.com', avatar: 'https://bundui-images.netlify.app/avatars/02.png', role_id: 2 },
  { id: 3, name: 'Hally Gray', email: 'hally@site.com', avatar: 'https://bundui-images.netlify.app/avatars/03.png', role_id: 1 },
]

const data = ref(initialMembers.map(m => ({ ...m })))
const openIndex = ref<number | null>(null)

function setRole(memberId: number, roleId: number) {
  data.value = data.value.map(m => (m.id === memberId ? { ...m, role_id: roleId } : m))
  openIndex.value = null
}
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>Team Members</UiCardTitle>
      <UiCardDescription>Invite your team members to collaborate.</UiCardDescription>
    </UiCardHeader>
    <UiCardContent class="grid gap-6">
      <div
        v-for="(member, key) in data"
        :key="member.id"
        class="flex items-center justify-between space-x-4"
      >
        <div class="flex items-center space-x-4">
          <UiAvatar>
            <UiAvatarImage :src="member.avatar" />
            <UiAvatarFallback>OM</UiAvatarFallback>
          </UiAvatar>
          <div>
            <p class="text-sm font-medium leading-none">
              {{ member.name }}
            </p>
            <p class="text-sm text-muted-foreground">
              {{ member.email }}
            </p>
          </div>
        </div>
        <UiPopover :open="openIndex === key" @update:open="(v) => (openIndex = v ? key : null)">
          <UiPopoverTrigger as-child>
            <UiButton variant="outline" class="ml-auto">
              {{ roles.find(r => r.id === member.role_id)?.name }}
              <ChevronsDown class="ml-2 h-4 w-4 text-muted-foreground" />
            </UiButton>
          </UiPopoverTrigger>
          <UiPopoverContent class="w-auto p-0" align="end">
            <UiCommand class="overflow-hidden rounded-lg border-0">
              <UiCommandInput placeholder="Select new role..." />
              <UiCommandList>
                <UiCommandEmpty>No roles found.</UiCommandEmpty>
                <UiCommandGroup class="p-2">
                  <UiCommandItem
                    v-for="role in roles"
                    :key="role.id"
                    :value="role.name"
                    class="flex items-start gap-2 px-4 py-2"
                    @select="setRole(member.id, role.id)"
                  >
                    <div>
                      <p>{{ role.name }}</p>
                      <p class="text-sm text-muted-foreground">
                        {{ role.description }}
                      </p>
                    </div>
                    <Check v-if="member.role_id === role.id" class="ml-auto flex size-4 text-primary" />
                  </UiCommandItem>
                </UiCommandGroup>
              </UiCommandList>
            </UiCommand>
          </UiPopoverContent>
        </UiPopover>
      </div>
    </UiCardContent>
  </UiCard>
</template>
