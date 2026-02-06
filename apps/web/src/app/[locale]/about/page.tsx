import { type Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://indiemarket.co';
  const localePrefix = locale === 'fr' ? '' : `/${locale}`;

  return {
    title: locale === 'fr' ? 'À propos' : 'About',
    description: locale === 'fr'
      ? 'IndieMarket rassemble des marques indépendantes qui produisent de manière responsable. Découvrez notre mission.'
      : 'IndieMarket gathers independent brands that produce responsibly. Discover our mission.',
    alternates: {
      canonical: `${baseUrl}${localePrefix}/about`,
      languages: { 'fr': `${baseUrl}/about`, 'en': `${baseUrl}/en/about` },
    },
  };
}

export default async function AboutPage() {
  const t = await getTranslations('about');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl mb-8">{t('title')}</h1>

        <div className="prose prose-neutral max-w-none">
          <p className="text-lg text-neutral-600 mb-6">
            {t('intro')}
          </p>

          <h2 className="font-serif text-2xl mt-12 mb-4">{t('missionTitle')}</h2>
          <p className="text-neutral-600 mb-6">
            {t('missionText')}
          </p>

          <h2 className="font-serif text-2xl mt-12 mb-4">{t('valuesTitle')}</h2>
          <p className="text-neutral-600">
            {t('valuesText')}
          </p>
        </div>
      </div>
    </div>
  );
}
