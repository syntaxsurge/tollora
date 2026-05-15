'use client'

import * as React from 'react'

export function CursorFlameGlow() {
  const trailRef = React.useRef<HTMLDivElement>(null)
  const coreRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const root = document.documentElement
    const trail = trailRef.current
    const core = coreRef.current
    const finePointer = window.matchMedia('(pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (!trail || !core) {
      return
    }

    if (!finePointer.matches || reducedMotion.matches) {
      root.dataset.cursorGlow = 'off'
      return
    }

    root.dataset.cursorGlow = 'on'

    let frame = 0
    let visible = false
    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let currentX = targetX
    let currentY = targetY

    const updatePosition = () => {
      currentX += (targetX - currentX) * 0.12
      currentY += (targetY - currentY) * 0.12

      root.style.setProperty('--cursor-glow-x', `${currentX}px`)
      root.style.setProperty('--cursor-glow-y', `${currentY}px`)
      trail.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`
      core.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`

      if (visible) {
        frame = window.requestAnimationFrame(updatePosition)
      } else {
        frame = 0
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      targetX = event.clientX
      targetY = event.clientY
      trail.style.opacity = '1'
      core.style.opacity = '1'

      if (frame === 0) {
        visible = true
        frame = window.requestAnimationFrame(updatePosition)
      }
    }

    const handlePointerLeave = () => {
      visible = false
      trail.style.opacity = '0'
      core.style.opacity = '0'
    }

    updatePosition()
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)

      if (frame !== 0) {
        window.cancelAnimationFrame(frame)
      }

      delete root.dataset.cursorGlow
      root.style.removeProperty('--cursor-glow-x')
      root.style.removeProperty('--cursor-glow-y')
      trail.style.opacity = '0'
      core.style.opacity = '0'
    }
  }, [])

  return (
    <div aria-hidden='true' className='cursor-flame-layer'>
      <div ref={trailRef} className='cursor-flame-trail' />
      <div ref={coreRef} className='cursor-flame-core' />
    </div>
  )
}
