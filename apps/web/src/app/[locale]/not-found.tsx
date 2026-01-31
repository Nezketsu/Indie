import { Button } from "@/components/ui/button";
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="text-center max-w-md mx-auto">
        <h1 className="font-serif text-6xl md:text-8xl mb-6">404</h1>
        <h2 className="font-serif text-2xl md:text-3xl mb-4">{t('title')}</h2>
        <p className="text-neutral-500 mb-8">
          {t('description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/">{t('backHome')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/products">{t('browseProducts')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
