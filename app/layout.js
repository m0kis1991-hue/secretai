import './globals.css'

export const metadata = {
  title: 'AI Γραμματέας',
  description: 'Προσωπικός AI Γραμματέας – Emails, Πρόγραμμα, Έγγραφα',
  manifest: '/manifest.json',
  themeColor: '#0a0d14',
}

export default function RootLayout({ children }) {
  return (
    <html lang="el">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Γραμματέας" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
