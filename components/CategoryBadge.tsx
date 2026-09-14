import type { Category } from "@/lib/types";

export default function CategoryBadge({
  category,
}: {
  category?: Pick<Category, "id" | "name" | "icon" | "color"> | null;
}) {
  if (!category) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: `${category.color ?? "#333"}1f`,
        color: category.color ?? "#e9e9e9",
      }}
    >
      <span>{category.icon}</span>
      {category.name.toUpperCase()}
    </span>
  );
}
