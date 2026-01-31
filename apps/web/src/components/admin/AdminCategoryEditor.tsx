"use client";

import { useState } from "react";
import { Edit2, Check, X } from "lucide-react";

interface Category {
    id: string;
    name: string;
    slug: string;
}

interface AdminCategoryEditorProps {
    productId: string;
    currentCategory: Category | null;
    categories: Category[];
}

export function AdminCategoryEditor({
    productId,
    currentCategory,
    categories,
}: AdminCategoryEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState(currentCategory?.id || "");
    const [saving, setSaving] = useState(false);
    const [savedCategory, setSavedCategory] = useState(currentCategory);

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/admin/products/${productId}/category`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ categoryId: selectedCategoryId || null }),
            });

            if (response.ok) {
                const newCategory = categories.find((c) => c.id === selectedCategoryId) || null;
                setSavedCategory(newCategory);
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setSelectedCategoryId(savedCategory?.id || "");
        setIsEditing(false);
    };

    if (!isEditing) {
        return (
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditing(true);
                }}
                className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600 transition-colors"
            >
                <Edit2 className="w-3 h-3" />
                {savedCategory?.name || "No category"}
            </button>
        );
    }

    return (
        <div
            className="flex items-center gap-1"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={saving}
                className="px-2 py-1 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[100px]"
            >
                <option value="">-- None --</option>
                {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                        {cat.name}
                    </option>
                ))}
            </select>
            <button
                onClick={handleSave}
                disabled={saving}
                className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
                <Check className="w-3 h-3" />
            </button>
            <button
                onClick={handleCancel}
                disabled={saving}
                className="p-1 bg-neutral-500 text-white rounded hover:bg-neutral-600 disabled:opacity-50"
            >
                <X className="w-3 h-3" />
            </button>
        </div>
    );
}
