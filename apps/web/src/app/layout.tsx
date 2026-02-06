import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getLocale } from 'next-intl/server';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://indiemarket.co'),
  title: {
    default: "IndieMarket - Découvrez les marques indépendantes",
    template: "%s | IndieMarket",
  },
  description:
    "Marketplace curatée avec les meilleurs produits des marques de mode indépendantes. Découvrez vêtements, accessoires et chaussures de créateurs émergents.",
  keywords: [
    "marques indépendantes",
    "mode indépendante",
    "créateurs mode",
    "marques émergentes",
    "marketplace mode",
    "indie brands",
    "independent fashion",
    "slow fashion",
    "mode éthique",
  ],
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
