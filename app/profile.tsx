'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'

export const userName = 'الهام اسلام نژد'
const key = 'didar-profile-photo'

export default function Profile() {
  const [photo, setPhoto] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    try { setPhoto(localStorage.getItem(key) ?? '') } catch { /* Use the default avatar. */ }
  }, [])

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
      setMessage('عکس JPG، PNG یا WebP تا ۱۲ مگابایت انتخاب کنید.')
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
      if (!context) throw new Error('Image rendering is unavailable')
      const size = Math.min(image.naturalWidth, image.naturalHeight)
      context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 160, 160)
      const resized = canvas.toDataURL('image/webp', .86)
      localStorage.setItem(key, resized)
      setPhoto(resized)
      setMessage('عکس پروفایل ذخیره شد.')
    } catch {
      setMessage('عکس پروفایل ذخیره نشد.')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return <div className="sidebar-person">
    <label className="avatar-frame avatar-upload" title="تغییر عکس پروفایل">
      <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="تغییر عکس پروفایل" onChange={upload}/>
      <Image src={photo || '/hr-avatar.webp'} alt="" width={48} height={48} unoptimized={Boolean(photo)}/>
      <span className="avatar-camera"><Camera size={12}/></span>
    </label>
    <div className="sidebar-label"><strong>{userName}</strong><small>منابع انسانی الکتروکویر</small>{message && <small role="status">{message}</small>}</div>
  </div>
}
