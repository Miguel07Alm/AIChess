import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { GameProvider } from "@/contexts/GameContext"
import { RTCProvider } from "@/contexts/RTCContext"

import { Geist } from 'next/font/google'

const geist = Geist({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <html lang="en" suppressHydrationWarning>
          <body className={geist.className}>
              <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  disableTransitionOnChange
              >
                  <RTCProvider>
                      <GameProvider>{children}</GameProvider>
                  </RTCProvider>
              </ThemeProvider>
              <Toaster />
          </body>
      </html>
  );
}
