import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "comedy.nyc — get notified when comedians are in town",
  description:
    "Browse upcoming comedy shows in NYC at the Comedy Cellar, The Stand, and more. Follow your favorite comedians and get notified when they perform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-dvh flex flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>
          <Header />
          <main id="main-content" className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
            {children}
          </main>
          <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
            <div className="max-w-6xl mx-auto px-4">
              Comedy.NYC &middot; Not affiliated with the Comedy Cellar
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
