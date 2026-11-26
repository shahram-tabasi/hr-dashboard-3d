'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import Image from 'next/image'
import { MessageSquare } from 'lucide-react'

const storageKey = 'didar-custom-logo'

export default function DidarMark() {
  const [logo, setLogo] = useState('')
  const [status, setStatus] = useState('')
  useEffect(() => {
    try { setLogo(localStorage.getItem(storageKey) ?? '') } catch { /* Use the built-in mark. */ }
  }, [])

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setStatus('فایل PNG، SVG، JPG یا WebP تا ۵ مگابایت انتخاب کنید.')
      return
    }
    const url = URL.createObjectURL(file)
    try {
      const image = document.createElement('img')
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 160
      const context = canvas.getContext('2d')
      if (!context || !image.naturalWidth || !image.naturalHeight) throw new Error('Invalid graphic')
      const ratio = Math.min(160 / image.naturalWidth, 160 / image.naturalHeight)
      const width = image.naturalWidth * ratio
      const height = image.naturalHeight * ratio
      context.drawImage(image, (160 - width) / 2, (160 - height) / 2, width, height)
      const result = canvas.toDataURL('image/png')
      setLogo(result)
      localStorage.setItem(storageKey, result)
      setStatus('لوگوی دیدار در این مرورگر ذخیره شد.')
    } catch {
      setStatus('فایل لوگو در مرورگر ذخیره نشد.')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return <label className="brand-icon didar-logo-picker" title="انتخاب لوگوی دیدار">
    <input type="file" accept=".png,.svg,.webp,.jpg,.jpeg,image/png,image/svg+xml,image/webp,image/jpeg" aria-label="انتخاب لوگوی دیدار" onChange={choose}/>
    {logo ? <Image src={logo} unoptimized alt="لوگوی دیدار" width={30} height={30}/> : <MessageSquare className="didar-mark" size={24} aria-hidden="true"/>}
    <span className="layout-status" role="status">{status}</span>
  </label>
}
