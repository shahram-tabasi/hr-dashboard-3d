'use client'

import { useEffect, useState } from 'react'

const minimumDelay = 3 * 60 * 1000
const maximumDelay = 4 * 60 * 1000
const meteorDuration = 1800

export default function Sky() {
  const [meteor, setMeteor] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let next: number | undefined
    let removal: number | undefined

    function schedule() {
      next = window.setTimeout(() => {
        setMeteor(true)
        removal = window.setTimeout(() => setMeteor(false), meteorDuration)
        schedule()
      }, minimumDelay + Math.random() * (maximumDelay - minimumDelay))
    }

    function reset() {
      window.clearTimeout(next)
      window.clearTimeout(removal)
      setMeteor(false)
      if (!motion.matches) schedule()
    }

    if (!motion.matches) schedule()
    motion.addEventListener('change', reset)
    return () => {
      window.clearTimeout(next)
      window.clearTimeout(removal)
      motion.removeEventListener('change', reset)
    }
  }, [])

  return <div className="sky" aria-hidden="true">
    <div className="stars stars-near" />
    <div className="stars stars-far" />
    {meteor && <span className="meteor" />}
  </div>
}
