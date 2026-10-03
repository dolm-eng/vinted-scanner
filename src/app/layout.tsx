import type { Metadata, Viewport } from "next";
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/500.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/800.css";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Griffe — scan & revente Vinted",
  description:
    "Scanne un article, estime son prix et suis tes ventes Vinted depuis ton téléphone.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Griffe",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#211d19",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <RegisterSW />
        <div className="flex-1 pb-20">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
