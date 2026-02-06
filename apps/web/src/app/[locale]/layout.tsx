import { type Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://indiemarket.co';

  return {
    title: {
      default: t('title'),
      template: '%s | IndieMarket',
    },
    description: t('description'),
    keywords: t('keywords').split(',').map(k => k.trim()),
    alternates: {
      canonical: locale === 'fr' ? baseUrl : `${baseUrl}/en`,
      languages: {
        'fr': baseUrl,
        'en': `${baseUrl}/en`,
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      url: locale === 'fr' ? baseUrl : `${baseUrl}/en`,
      siteName: 'IndieMarket',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    }
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
        <WishlistProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify([
                {
                  '@context': 'https://schema.org',
                  '@type': 'WebSite',
                  name: 'IndieMarket',
                  url: process.env.NEXT_PUBLIC_APP_URL || 'https://indiemarket.co',
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                      '@type': 'EntryPoint',
                      urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL || 'https://indiemarket.co'}/${locale}/products?search={search_term_string}`
                    },
                    'query-input': 'required name=search_term_string'
                  }
                },
                {
                  '@context': 'https://schema.org',
                  '@type': 'Organization',
                  name: 'IndieMarket',
                  url: 'https://indiemarket.co',
                  logo: 'https://indiemarket.co/icon',
                  description: 'Marketplace curatée avec les meilleurs produits des marques de mode indépendantes.',
                  contactPoint: {
                    '@type': 'ContactPoint',
                    email: 'indiemarket@outlook.fr',
                    contactType: 'customer service',
                    availableLanguage: ['French', 'English']
                  }
                }
              ])
            }}
          />
        </WishlistProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
