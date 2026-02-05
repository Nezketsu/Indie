import { getTranslations } from 'next-intl/server';

export default async function PrivacyPage() {
  const t = await getTranslations('privacy');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl mb-8">{t('title')}</h1>

        <div className="prose prose-neutral max-w-none">
          <p className="text-sm text-neutral-400 mb-8">{t('lastUpdated')}</p>

          <h2 className="font-serif text-2xl mt-8 mb-4">{t('collectTitle')}</h2>
          <p className="text-neutral-600 mb-6">
            {t('collectText')}
          </p>

          <h2 className="font-serif text-2xl mt-8 mb-4">{t('useTitle')}</h2>
          <p className="text-neutral-600 mb-6">
            {t('useText')}
          </p>

          <h2 className="font-serif text-2xl mt-8 mb-4">{t('cookiesTitle')}</h2>
          <p className="text-neutral-600 mb-6">
            {t('cookiesText')}
          </p>

          <h2 className="font-serif text-2xl mt-8 mb-4">{t('contactTitle')}</h2>
          <p className="text-neutral-600">
            {t('contactText')}
          </p>
        </div>
      </div>
    </div>
  );
}
