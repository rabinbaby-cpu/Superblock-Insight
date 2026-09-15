import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight, Columns3, Download, Filter, MoreHorizontal, Plus, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar, PageHeader, StatusBadge, TableSearch, downloadCsv } from "@/components/dashboard-ui";
import { QuickFormDialog } from "@/components/ActionDialogs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { customers, formatCurrency, formatNumber, type Customer } from "@/data/mockData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const columns = ["ID", "Customer", "Contact", "Activated", "Subscription", "Plan", "Renewal", "MRR", "Usage", "Last activity", "Health"] as const;
type Column = (typeof columns)[number];
type SortKey = "company" | "activatedAt" | "renewal" | "mrr" | "usage" | "health";

export default function Customers() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [plan, setPlan] = useState("All plans");
  const [health, setHealth] = useState("All health");
  const [sortKey, setSortKey] = useState<SortKey>("company");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [visible, setVisible] = useState<Column[]>([...columns]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const pageSize = 7;

  const filtered = useMemo(() => {
    const rows = customers.filter((customer) => {
      const matchesQuery = `${customer.company} ${customer.id} ${customer.contact.name} ${customer.owner.name}`.toLowerCase().includes(query.toLowerCase());
      return matchesQuery && (status === "All statuses" || customer.status === status) && (plan === "All plans" || customer.plan === plan) && (health === "All health" || customer.health.status === health);
    });
    return rows.sort((a, b) => {
      const values: Record<SortKey, [string | number, string | number]> = {
        company: [a.company, b.company], activatedAt: [a.activatedAt, b.activatedAt], renewal: [a.renewal, b.renewal], mrr: [a.subscription.mrr, b.subscription.mrr], usage: [a.usage.messages, b.usage.messages], health: [a.health.score, b.health.score],
      };
      const [left, right] = values[sortKey];
      const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
      return sortDirection === "asc" ? result : -result;
    });
  }, [query, status, plan, health, sortKey, sortDirection]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const isVisible = (column: Column) => visible.includes(column);
  const clearFilters = () => { setQuery(""); setStatus("All statuses"); setPlan("All plans"); setHealth("All health"); setPage(1); };
  const sort = (key: SortKey) => { if (sortKey === key) setSortDirection((value) => value === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDirection("asc"); } };
  const exportRows = () => { downloadCsv("superblock-customers.csv", filtered.map((c) => ({ ID: c.id, Customer: c.company, Status: c.status, Plan: c.plan, MRR: c.subscription.mrr, Usage: c.usage.messages, Health: c.health.score }))); toast.success("Customer list exported"); };
  const allPageSelected = paginated.length > 0 && paginated.every((customer) => selected.includes(customer.id));

  return (
    <AppShell breadcrumbs={["Customers"]}>
      <PageHeader eyebrow="Customer operations" title="Customers" description="Manage subscriptions, account health, ownership, renewal risk, and platform adoption from one workspace." actions={<QuickFormDialog type="customer" title="Add customer" description="Create a new customer record using mock workspace data." trigger={<Button size="sm"><Plus className="size-3.5" />Add customer</Button>} />} />

      <div className="mt-4 panel overflow-hidden">
        <TableSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search company, ID, contact, or owner…" actions={<>
          <Button variant="outline" size="sm" className="h-8 bg-card text-xs" onClick={() => toast.success("Filter saved", { description: "Customer operations · Personal view" })}><Save className="size-3.5" />Save view</Button>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8 bg-card text-xs"><Columns3 className="size-3.5" />Columns</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Visible columns</DropdownMenuLabel><DropdownMenuSeparator />{columns.map((column) => <DropdownMenuCheckboxItem key={column} checked={visible.includes(column)} onCheckedChange={(checked) => setVisible((items) => checked ? [...items, column] : items.filter((item) => item !== column))}>{column}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
          <Button variant="outline" size="sm" className="h-8 bg-card text-xs" onClick={exportRows}><Download className="size-3.5" />Export</Button>
        </>} />

        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-muted/15 px-3 py-2">
          <Filter className="size-3.5 text-muted-foreground" />
          <FilterSelect value={status} onChange={(value) => { setStatus(value); setPage(1); }} items={["All statuses", "Active", "Paid", "Trial", "Renewal Due", "Suspended", "Expired"]} />
          <FilterSelect value={plan} onChange={(value) => { setPlan(value); setPage(1); }} items={["All plans", "Starter", "Growth", "Advanced", "Custom"]} />
          <FilterSelect value={health} onChange={(value) => { setHealth(value); setPage(1); }} items={["All health", "Healthy", "At Risk", "Expansion", "Renewal Risk"]} />
          <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground" onClick={clearFilters}>Clear filters</Button>
          <span className="ml-auto font-mono text-[9px] text-muted-foreground">{filtered.length} records</span>
        </div>

        {selected.length > 0 && <div className="flex items-center gap-3 border-b border-primary/20 bg-primary/5 px-3 py-2"><span className="text-[11px] font-medium">{selected.length} selected</span><Button variant="outline" size="sm" className="h-7 bg-card text-[10px]" onClick={() => toast.success("Owner updated for selected customers")}>Assign owner</Button><Button variant="outline" size="sm" className="h-7 bg-card text-[10px]" onClick={() => toast.success("Tags applied")}>Add tag</Button><Button variant="ghost" size="sm" className="ml-auto h-7 text-[10px]" onClick={() => setSelected([])}>Clear</Button></div>}

        <div className="overflow-x-auto">
          <table className="data-table min-w-[1240px]">
            <thead><tr>
              <th className="w-10"><Checkbox checked={allPageSelected} onCheckedChange={(checked) => setSelected(checked ? Array.from(new Set([...selected, ...paginated.map((c) => c.id)])) : selected.filter((id) => !paginated.some((c) => c.id === id)))} aria-label="Select all customers on page" /></th>
              {isVisible("ID") && <th>ID</th>}
              {isVisible("Customer") && <SortableHead label="Customer" field="company" current={sortKey} direction={sortDirection} onSort={sort} />}
              {isVisible("Contact") && <th>Contact / owner</th>}
              {isVisible("Activated") && <SortableHead label="Activated" field="activatedAt" current={sortKey} direction={sortDirection} onSort={sort} />}
              {isVisible("Subscription") && <th>Subscription</th>}
              {isVisible("Plan") && <th>Plan</th>}
              {isVisible("Renewal") && <SortableHead label="Renewal" field="renewal" current={sortKey} direction={sortDirection} onSort={sort} />}
              {isVisible("MRR") && <SortableHead label="MRR" field="mrr" current={sortKey} direction={sortDirection} onSort={sort} align="right" />}
              {isVisible("Usage") && <SortableHead label="Total usage" field="usage" current={sortKey} direction={sortDirection} onSort={sort} align="right" />}
              {isVisible("Last activity") && <th>Last activity</th>}
              {isVisible("Health") && <SortableHead label="Health" field="health" current={sortKey} direction={sortDirection} onSort={sort} />}
              <th className="w-10" />
            </tr></thead>
            <tbody>{paginated.map((customer) => <CustomerRow key={customer.id} customer={customer} isVisible={isVisible} selected={selected.includes(customer.id)} toggleSelected={() => setSelected((items) => items.includes(customer.id) ? items.filter((id) => id !== customer.id) : [...items, customer.id])} />)}</tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[10px] text-muted-foreground">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} customers</div>
          <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="size-7 bg-card" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="size-3.5" /></Button>{Array.from({ length: pages }, (_, index) => index + 1).map((item) => <Button key={item} variant={item === page ? "default" : "ghost"} size="icon" className="size-7 text-[10px]" onClick={() => setPage(item)}>{item}</Button>)}<Button variant="outline" size="icon" className="size-7 bg-card" disabled={page === pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}><ChevronRight className="size-3.5" /></Button></div>
        </div>
      </div>
    </AppShell>
  );
}

function FilterSelect({ value, onChange, items }: { value: string; onChange: (value: string) => void; items: string[] }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className="h-7 w-auto min-w-[112px] border-dashed bg-card px-2 text-[10px]"><SelectValue /></SelectTrigger><SelectContent>{items.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>;
}

function SortableHead({ label, field, current, direction, onSort, align }: { label: string; field: SortKey; current: SortKey; direction: "asc" | "desc"; onSort: (key: SortKey) => void; align?: "right" }) {
  return <th className={align === "right" ? "text-right" : ""}><button className={cn("inline-flex items-center gap-1 hover:text-foreground", align === "right" && "ml-auto")} onClick={() => onSort(field)}>{label}{current !== field ? <ArrowUpDown className="size-3 opacity-50" /> : direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}</button></th>;
}

function CustomerRow({ customer, isVisible, selected, toggleSelected }: { customer: Customer; isVisible: (column: Column) => boolean; selected: boolean; toggleSelected: () => void }) {
  return <tr className={cn(selected && "bg-primary/[0.04]")}>
    <td><Checkbox checked={selected} onCheckedChange={toggleSelected} aria-label={`Select ${customer.company}`} /></td>
    {isVisible("ID") && <td className="font-mono text-[10px] text-muted-foreground">{customer.id}</td>}
    {isVisible("Customer") && <td><Link href={`/customers/${customer.id}`} className="flex items-center gap-2.5 group"><Avatar initials={customer.initials} /><div><div className="font-medium group-hover:underline">{customer.company}</div><div className="text-[9px] text-muted-foreground">{customer.industry} · {customer.region}</div></div></Link></td>}
    {isVisible("Contact") && <td><div>{customer.contact.name}</div><div className="text-[9px] text-muted-foreground">Owner: {customer.owner.name}</div></td>}
    {isVisible("Activated") && <td>{customer.activatedAt}</td>}
    {isVisible("Subscription") && <td><StatusBadge status={customer.status} /></td>}
    {isVisible("Plan") && <td><span className="rounded-md border bg-muted/30 px-2 py-1 text-[10px] font-medium">{customer.plan}</span></td>}
    {isVisible("Renewal") && <td>{customer.renewal}</td>}
    {isVisible("MRR") && <td className="text-right font-tabular font-medium">{formatCurrency(customer.subscription.mrr)}</td>}
    {isVisible("Usage") && <td className="text-right font-tabular">{formatNumber(customer.usage.messages)}</td>}
    {isVisible("Last activity") && <td>{customer.lastActivity}</td>}
    {isVisible("Health") && <td><div className="flex items-center gap-2"><span className={cn("grid size-7 place-items-center rounded-full border font-tabular text-[10px] font-semibold", customer.health.score >= 75 ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : customer.health.score >= 60 ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300")}>{customer.health.score}</span><span className="text-[10px]">{customer.health.status}</span></div></td>}
    <td><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={`/customers/${customer.id}`}>View customer</Link></DropdownMenuItem><DropdownMenuItem onClick={() => toast.success("Customer edit opened")}>Edit customer</DropdownMenuItem><DropdownMenuItem onClick={() => toast.success("Note added to customer")}>Add note</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-rose-600" onClick={() => toast.success("Customer access suspended")}>Suspend access</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
  </tr>;
}
