"use client";

import { useState } from "react";
import { Edit2, Check, X } from "lucide-react";

// Standard product types matching the categorization system
const PRODUCT_TYPES = [
    "Tops",
    "Hoodies & Sweats",
    "Knitwear",
    "Jackets & Coats",
    "Pants",
    "Shorts",
    "Footwear",
    "Accessories",
    "Lifestyle",
    "Packs & Boxes",
    "Other",
];

interface AdminProductTypeEditorProps {
    productId: string;
    currentType: string | null;
}

export function AdminProductTypeEditor({
    productId,
    currentType,
}: AdminProductTypeEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedType, setSelectedType] = useState(currentType || "");
    const [saving, setSaving] = useState(false);
    const [savedType, setSavedType] = useState(currentType);

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/admin/products/${productId}/type`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ productType: selectedType }),
            });

            if (response.ok) {
                setSavedType(selectedType);
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setSelectedType(savedType || "");
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
                {savedType || "No type"}
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
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                disabled={saving}
                className="px-2 py-1 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[100px]"
            >
                <option value="">-- None --</option>
                {PRODUCT_TYPES.map((type) => (
                    <option key={type} value={type}>
                        {type}
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
