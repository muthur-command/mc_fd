import { onMounted, onUnmounted, ref } from 'vue'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

export function useParticlesCanvas(canvasRef: { value: HTMLCanvasElement | null }) {
  const animationId = ref<number | null>(null)
  const particles = ref<Particle[]>([])

  function particleColor() {
    return document.documentElement.getAttribute('data-theme') === 'light'
      ? 'rgba(165, 78, 22, 0.82)'
      : 'rgba(247,255,155,0.68)'
  }

  function resize(canvas: HTMLCanvasElement) {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  function spawn(canvas: HTMLCanvasElement) {
    const maxCount = window.matchMedia('(min-width: 768px)').matches ? 170 : 70
    particles.value = Array.from({ length: maxCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.9 + 0.35,
    }))
  }

  function draw(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx)
      return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const fillStyle = particleColor()

    for (const particle of particles.value) {
      particle.x += particle.vx
      particle.y += particle.vy
      if (particle.x < -10)
        particle.x = canvas.width + 10
      if (particle.x > canvas.width + 10)
        particle.x = -10
      if (particle.y < -10)
        particle.y = canvas.height + 10
      if (particle.y > canvas.height + 10)
        particle.y = -10

      ctx.beginPath()
      ctx.fillStyle = fillStyle
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
      ctx.fill()
    }

    animationId.value = requestAnimationFrame(() => draw(canvas))
  }

  let onResize: (() => void) | null = null

  onMounted(() => {
    const canvas = canvasRef.value
    if (!canvas)
      return

    onResize = () => {
      resize(canvas)
      spawn(canvas)
    }

    onResize()
    draw(canvas)
    window.addEventListener('resize', onResize)
  })

  onUnmounted(() => {
    if (onResize)
      window.removeEventListener('resize', onResize)
    if (animationId.value !== null)
      cancelAnimationFrame(animationId.value)
  })
}
