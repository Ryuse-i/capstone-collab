import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageItem = number | "ellipsis";

function getPageItems(page: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  let start = Math.max(2, page - 1);
  let end = Math.min(total - 1, page + 1);
  if (page <= 2) end = 3;
  if (page >= total - 1) start = total - 2;

  const items: PageItem[] = [1];
  if (start > 2) items.push("ellipsis");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push("ellipsis");
  items.push(total);
  return items;
}

interface PagePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export default function PagePagination({
  page,
  totalPages,
  onPageChange,
  disabled,
}: PagePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mx-auto flex items-center gap-1 rounded-lg border border-border bg-card p-2 shadow-sm"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Previous page"
        className="h-9 w-9 text-muted-foreground"
        disabled={page === 1 || disabled}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {getPageItems(page, totalPages).map((item, idx) =>
        item === "ellipsis" ? (
          <span
            key={`e-${idx}`}
            className="w-9 select-none text-center text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Button
            key={item}
            variant={item === page ? "default" : "ghost"}
            size="icon"
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "h-9 w-9 font-semibold",
              item !== page && "text-muted-foreground"
            )}
            disabled={disabled}
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        )
      )}

      <Button
        variant="ghost"
        size="icon"
        aria-label="Next page"
        className="h-9 w-9 text-muted-foreground"
        disabled={page === totalPages || disabled}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}