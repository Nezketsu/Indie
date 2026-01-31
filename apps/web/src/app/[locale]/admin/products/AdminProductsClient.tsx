"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Product {
    id: string;
    title: string;
    slug: string;
    productType: string | null;
    priceMin: number;
    isAvailable: boolean;
    brand: {
        name: string;
        slug: string;
    };
    image: string | null;
    category: {
        id: string;
        name: string;
        slug: string;
    } | null;
}

interface Category {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
}

interface AdminProductsClientProps {
    initialProducts: Product[];
    categories: Category[];
    total: number;
}

const ITEMS_PER_PAGE = 20;

export function AdminProductsClient({
    initialProducts,
    categories,
    total,
}: AdminProductsClientProps) {
    const [products, setProducts] = useState(initialProducts);
    const [updating, setUpdating] = useState<string | null>(null);
    const [filter, setFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const filteredProducts = useMemo(() => {
        return products.filter(
            (p) =>
                p.title.toLowerCase().includes(filter.toLowerCase()) ||
                p.brand.name.toLowerCase().includes(filter.toLowerCase()) ||
                p.productType?.toLowerCase().includes(filter.toLowerCase())
        );
    }, [products, filter]);

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage]);

    // Reset to page 1 when filter changes
    const handleFilterChange = (value: string) => {
        setFilter(value);
        setCurrentPage(1);
    };

    const handleCategoryChange = async (productId: string, categoryId: string) => {
        setUpdating(productId);

        try {
            const response = await fetch(`/api/admin/products/${productId}/category`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ categoryId: categoryId || null }),
            });

            if (response.ok) {
                setProducts((prev) =>
                    prev.map((p) =>
                        p.id === productId
                            ? {
                                ...p,
                                category: categoryId
                                    ? categories.find((c) => c.id === categoryId) || null
                                    : null,
                            }
                            : p
                    )
                );
            } else {
                console.error("Failed to update category");
            }
        } catch (error) {
            console.error("Error updating category:", error);
        } finally {
            setUpdating(null);
        }
    };

    return (
        <div>
            {/* Search filter */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={filter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
            </div>

            {/* Products table */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-neutral-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Produit
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Marque
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Catégorie
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                        {paginatedProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-neutral-50">
                                {/* Product info */}
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-neutral-100 rounded overflow-hidden shrink-0">
                                            {product.image ? (
                                                <Image
                                                    src={product.image}
                                                    alt={product.title}
                                                    width={48}
                                                    height={48}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                                                    N/A
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm truncate max-w-[200px]">
                                                {product.title}
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                {product.priceMin.toFixed(2)} €
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                {/* Brand */}
                                <td className="px-4 py-4">
                                    <span className="text-sm">{product.brand.name}</span>
                                </td>

                                {/* Product type */}
                                <td className="px-4 py-4">
                                    <span className="text-sm text-neutral-600">
                                        {product.productType || "-"}
                                    </span>
                                </td>

                                {/* Category dropdown */}
                                <td className="px-4 py-4">
                                    <select
                                        value={product.category?.id || ""}
                                        onChange={(e) =>
                                            handleCategoryChange(product.id, e.target.value)
                                        }
                                        disabled={updating === product.id}
                                        className={`px-3 py-1.5 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black ${updating === product.id ? "opacity-50 cursor-wait" : ""
                                            }`}
                                    >
                                        <option value="">-- Aucune --</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </td>

                                {/* Status */}
                                <td className="px-4 py-4">
                                    <span
                                        className={`inline-flex px-2 py-1 text-xs rounded-full ${product.isAvailable
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                            }`}
                                    >
                                        {product.isAvailable ? "En stock" : "Épuisé"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {paginatedProducts.length === 0 && (
                    <div className="px-4 py-8 text-center text-neutral-500">
                        Aucun produit trouvé
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-neutral-500">
                        Page {currentPage} sur {totalPages} ({filteredProducts.length} produits)
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Précédent
                        </button>

                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 text-sm rounded-lg ${currentPage === pageNum
                                                ? "bg-black text-white"
                                                : "hover:bg-neutral-100"
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Suivant
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Info for single page */}
            {totalPages <= 1 && (
                <div className="mt-4 text-sm text-neutral-500">
                    Affichage de {filteredProducts.length} produit(s) sur {total}
                </div>
            )}
        </div>
    );
}
