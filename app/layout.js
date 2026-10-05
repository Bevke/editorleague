import './globals.css'

export const metadata = {
  title: 'Barafella Exclusive',
  description: 'VIP Media Portal',
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
