import { getTranslations } from 'next-intl/server';

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
