"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  required?: boolean;
  badge?: string;
  badgeColor?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  grouped?: boolean; // if true, splits into Required / All Fields groups
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
  emptyMessage = "No results found.",
  grouped = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "required">("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const hasRequired = options.some((o) => o.required);

  const filtered = options.filter((o) => {
    const matchesSearch = !search.trim() ||
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase()) ||
      o.sublabel?.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === "all" || o.required;
    return matchesSearch && matchesTab;
  });

  useEffect(() => {
    if (open) { setTimeout(() => searchRef.current?.focus(), 50); setTab("all"); }
    else setSearch("");
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function renderOption(option: SearchableSelectOption) {
    return (
      <button
        key={option.value}
        type="button"
        onClick={() => { onChange(option.value); setOpen(false); }}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
          value === option.value && "bg-primary/5 text-primary"
        )}
      >
        <Check className={cn("h-3.5 w-3.5 shrink-0", value === option.value ? "opacity-100 text-primary" : "opacity-0")} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium">{option.label}</p>
            {option.required && (
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide bg-red-100 text-red-600 rounded px-1 py-0.5">Required</span>
            )}
            {option.badge && !option.required && (
              <span className={cn("shrink-0 text-[9px] font-semibold uppercase tracking-wide rounded px-1 py-0.5", option.badgeColor ?? "bg-muted text-muted-foreground")}>{option.badge}</span>
            )}
          </div>
          {option.sublabel && (
            <p className="truncate text-xs text-muted-foreground">{option.sublabel}</p>
          )}
        </div>
      </button>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-colors",
          "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
          open && "border-primary ring-2 ring-primary/20",
          disabled && "cursor-not-allowed opacity-50",
          !selected && "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          {selected?.required && (
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide bg-red-100 text-red-600 rounded px-1 py-0.5">Required</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-xl border bg-popover shadow-lg shadow-black/10">
          {/* Search */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Tabs */}
          {grouped && hasRequired && (
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setTab("all")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-medium transition-colors",
                  tab === "all" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Fields
              </button>
              <button
                type="button"
                onClick={() => setTab("required")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-medium transition-colors",
                  tab === "required" ? "border-b-2 border-red-500 text-red-600" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Required
              </button>
            </div>
          )}

          {/* Options */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                {tab === "required" ? "No required fields." : emptyMessage}
              </p>
            ) : (
              filtered.map(renderOption)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
