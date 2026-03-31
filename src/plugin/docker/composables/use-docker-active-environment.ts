import { ref } from 'vue'

export interface DockerActiveEnvironment { id: string, name: string }

const LS_KEY = 'mc-docker-active-environment'

const DEFAULT: DockerActiveEnvironment = { id: 'local', name: '' }

function load(): DockerActiveEnvironment {
  if (typeof localStorage === 'undefined')
    return { ...DEFAULT }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw)
      return { ...DEFAULT }
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object')
      return { ...DEFAULT }
    const rec = o as Record<string, unknown>
    if (typeof rec.id !== 'string' || rec.id.length === 0)
      return { ...DEFAULT }
    const name = typeof rec.name === 'string' ? rec.name : ''
    return { id: rec.id, name }
  }
  catch {
    return { ...DEFAULT }
  }
}

function persist(s: DockerActiveEnvironment) {
  if (typeof localStorage === 'undefined')
    return
  localStorage.setItem(LS_KEY, JSON.stringify(s))
}

/** 跨 Docker 子页面共享的「当前环境」（默认 local） */
const activeEnvironment = ref<DockerActiveEnvironment>(load())

export function useDockerActiveEnvironment() {
  function setActiveEnvironment(next: DockerActiveEnvironment) {
    activeEnvironment.value = { id: next.id, name: next.name }
    persist(activeEnvironment.value)
  }

  function resetToLocal() {
    setActiveEnvironment({ ...DEFAULT })
  }

  return {
    activeEnvironment,
    setActiveEnvironment,
    resetToLocal,
  }
}
