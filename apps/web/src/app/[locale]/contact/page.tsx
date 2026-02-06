import { type Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://indiemarket.co';
  const localePrefix = locale === 'fr' ? '' : `/${locale}`;

  return {
    title: 'Contact',
    description: locale === 'fr'
      ? 'Contactez IndieMarket pour toute question sur nos marques indépendantes et nos produits.'
      : 'Contact IndieMarket for any questions about our independent brands and products.',
    alternates: {
      canonical: `${baseUrl}${localePrefix}/contact`,
      languages: { 'fr': `${baseUrl}/contact`, 'en': `${baseUrl}/en/contact` },
    },
  };
}

export default async function ContactPage() {
  const t = await getTranslations('contact');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl mb-8">{t('title')}</h1>

        <div className="prose prose-neutral max-w-none">
          <p className="text-lg text-neutral-600 mb-8">
            {t('intro')}
          </p>

          <div className="bg-neutral-50 p-8 rounded-lg">
            <h2 className="font-serif text-xl mb-4">{t('emailTitle')}</h2>
            <a
              href="mailto:indiemarket@outlook.fr"
              className="text-black hover:underline underline-offset-4"
            >
              indiemarket@outlook.fr
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
