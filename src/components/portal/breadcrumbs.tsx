import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-xs text-muted-foreground mb-5", className)}
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
      >
        <Home className="h-3 w-3" />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1 min-w-0">
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          {item.href && i < items.length - 1 ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors truncate max-w-[180px]"
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn("truncate max-w-[220px]", i === items.length - 1 && "text-foreground font-medium")}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
