import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getAdminProducts, getAllCategories } from "@/lib/db/queries";
import { AdminProductsClient } from "./AdminProductsClient";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ locale: string }>;
}

export default async function AdminProductsPage({ params }: PageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    // Check if user is admin
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) {
        redirect(`/${locale}`);
    }

    // Fetch products and categories
    const [productsData, categoriesData] = await Promise.all([
        getAdminProducts({ limit: 100 }),
        getAllCategories(),
    ]);

    console.log("Categories fetched:", categoriesData.length, categoriesData.slice(0, 3));

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-serif mb-2">Administration - Produits</h1>
                <p className="text-neutral-500">
                    Gérez les catégories des produits ({productsData.total} produits)
                </p>
            </div>

            <AdminProductsClient
                initialProducts={productsData.products}
                categories={categoriesData}
                total={productsData.total}
            />
        </div>
    );
}
