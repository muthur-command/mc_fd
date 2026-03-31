import { Command } from 'lucide-vue-next'

import type { SidebarData, Team, User } from '../types'

const user: User = {
  name: 'shadcn',
  email: 'm@example.com',
  avatar: '/avatars/shadcn.jpg',
}

const teams: Team[] = [
  {
    name: 'MUTHUR',
    logo: Command,
    logoEmoji: '🐣',
    plan: 'Command',
  },
]

export const sidebarData: Omit<SidebarData, 'navMain'> = {
  user,
  teams,
}
