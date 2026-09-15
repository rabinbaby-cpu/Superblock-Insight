import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FileText, PackageOpen, Search, StickyNote, UsersRound } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { globalSearchItems } from "@/data/mockData";

const icons = { Customer: UsersRound, Invoice: FileText, Product: PackageOpen, Note: StickyNote } as const;

export function GlobalSearch() {
  const { searchOpen, setSearchOpen } = useApp();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  useEffect(() => { if (!searchOpen) setQuery(""); }, [searchOpen]);
  const groups = useMemo(() => {
    const filtered = globalSearchItems.filter((item) => `${item.title} ${item.detail} ${item.type}`.toLowerCase().includes(query.toLowerCase()));
    return ["Customer", "Invoice", "Product", "Note"].map((type) => ({ type, items: filtered.filter((item) => item.type === type).slice(0, 5) })).filter((group) => group.items.length);
  }, [query]);
  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-[620px]" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Search workspace</DialogTitle>
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3"><Search className="size-4 text-muted-foreground" /><CommandInput value={query} onValueChange={setQuery} placeholder="Search customers, invoices, products, notes…" className="h-12" /></div>
          <CommandList className="max-h-[420px] p-2">
            <CommandEmpty className="py-14 text-center text-xs text-muted-foreground">No results found. Try a company, invoice, or product name.</CommandEmpty>
            {groups.map((group, groupIndex) => (
              <div key={group.type}>
                {groupIndex > 0 && <CommandSeparator className="my-1" />}
                <CommandGroup heading={group.type}>
                  {group.items.map((item) => {
                    const Icon = icons[item.type as keyof typeof icons] || Search;
                    return <CommandItem key={`${item.type}-${item.title}`} value={`${item.type}-${item.title}`} className="gap-3 py-2" onSelect={() => { navigate(item.href); setSearchOpen(false); }}><span className="grid size-7 place-items-center rounded-md border bg-muted/40"><Icon className="size-3.5" /></span><div className="min-w-0"><div className="truncate text-xs font-medium">{item.title}</div><div className="truncate text-[10px] text-muted-foreground">{item.detail}</div></div><span className="ml-auto text-[9px] uppercase tracking-[0.08em] text-muted-foreground">{item.type}</span></CommandItem>;
                  })}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
          <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-[9px] text-muted-foreground"><span>Search across your Superblock workspace</span><div className="flex gap-2"><span>↑↓ Navigate</span><span>↵ Open</span><span>esc Close</span></div></div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
