import type { Category } from "@/lib/types";

export default function CategoryBadge({
  category,
}: {
  category?: Pick<Category, "id" | "name" | "icon" | "color"> | null;
}) {
  if (!category) return null;
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-accent"
      style={{
        backgroundColor: `${category.color ?? "#333"}1f`,
      }}
    >
      <span>{category.icon}</span>
      <span className="min-w-0 break-words">{category.name.toUpperCase()}</span>
    </span>
  );
}
