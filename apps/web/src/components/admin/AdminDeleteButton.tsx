"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface AdminDeleteButtonProps {
  productId: string;
  productTitle: string;
}

export function AdminDeleteButton({ productId, productTitle }: AdminDeleteButtonProps) {
  const t = useTranslations("admin");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        console.error("Failed to delete product");
        setIsConfirming(false);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      setIsConfirming(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirming(false);
  };

  if (isConfirming) {
    return (
      <div
        className="flex items-center gap-1"
        onClick={(e) => e.preventDefault()}
      >
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-[10px] rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? "..." : t("confirm")}
        </button>
        <button
          onClick={handleCancel}
          disabled={isDeleting}
          className="px-2 py-1 bg-neutral-200 text-neutral-700 text-[10px] rounded hover:bg-neutral-300"
        >
          {t("cancel")}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleDelete}
      className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-[10px] rounded hover:bg-red-600"
      title={`${t("delete")} ${productTitle}`}
    >
      <Trash2 className="w-3 h-3" />
    </button>
  );
}
