import Image from 'next/image'

export default function DidarMark() {
  return <span className="brand-icon didar-company-mark">
    <Image src="/mark-light.png" width={34} height={26} unoptimized alt="لوگوی سیمرغ فناوری هوشمند ایرانیان"/>
  </span>
}
