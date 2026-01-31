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
  title: "IndieMarket - Discover Independent Brands",
  description:
    "Curated marketplace featuring the best products from independent fashion brands. Shop clothing, accessories, and footwear from emerging designers.",
  keywords: [
    "indie brands",
    "independent fashion",
    "designer clothing",
    "emerging brands",
    "curated marketplace",
  ],
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
