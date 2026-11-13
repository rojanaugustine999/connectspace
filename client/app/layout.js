import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SocketProvider } from "@/lib/socket-context";
import NavBar from "@/components/NavBar";
import WakingBanner from "@/components/WakingBanner";
import SiteFooter from "@/components/SiteFooter";
import { themeScript } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Absolute base URL for link previews (og:image must be a full URL). Vercel provides
// VERCEL_PROJECT_PRODUCTION_URL automatically, e.g. "connectspace-opal.vercel.app".
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const description = "Follow people, share posts, chat in real time and build communities.";

// The tab icon (app/icon.svg), phone home-screen icon (app/apple-icon.png) and link preview image
// (app/opengraph-image.png) are picked up automatically by Next.js from their file names.
export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ConnectSpace", template: "%s · ConnectSpace" },
  description,
  applicationName: "ConnectSpace",
  openGraph: { type: "website", siteName: "ConnectSpace", title: "ConnectSpace", description },
  twitter: { card: "summary_large_image", title: "ConnectSpace", description },
};

// Colours the browser UI (address bar on mobile) to match the brand.
export const viewport = { themeColor: "#155DFC", colorScheme: "light dark" };

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: themeScript may add data-theme to <html> before React loads.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        // Column layout so the footer sits at the bottom even on short pages.
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-dvh flex-col antialiased`}
      >
        <AuthProvider>
          <SocketProvider>
            <NavBar />
            <WakingBanner />
            <div className="flex flex-1 flex-col">{children}</div>
            <SiteFooter />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
