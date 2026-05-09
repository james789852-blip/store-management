import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: '梁平店面建置管理系統',
  description: '雞肉飯連鎖店面建置管理',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
