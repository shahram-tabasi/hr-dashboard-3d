import Image from 'next/image'

export default function DidarMark() {
  return <span className="brand-icon didar-company-mark">
    <Image src="/simorgh-logo.png" width={31} height={28} unoptimized alt="لوگوی سیمرغ فناوری هوشمند ایرانیان"/>
  </span>
}
