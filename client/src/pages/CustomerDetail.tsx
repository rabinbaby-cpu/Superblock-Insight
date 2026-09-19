import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowLeft,
  CalendarPlus,
  Check,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  PackageOpen,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Avatar,
  SectionHeader,
  StatusBadge,
  downloadCsv,
} from "@/components/dashboard-ui";
import { CopyButton, QuickFormDialog } from "@/components/ActionDialogs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  analyticsSeries,
  customers as fallbackCustomers,
  formatCurrency,
  formatNumber,
  type Activity as CustomerActivity,
  type Customer,
  type Invoice,
  type Note,
  type Offering,
} from "@/data/mockData";
import { useCustomerAnalytics } from "@/lib/api/customerAnalytics";
import { useCustomerProfile } from "@/lib/api/customerProfile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "—";
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatActivatedDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatLastActive(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

const overviewMetrics = [
  ["Total messages", "messages", "+18.4%"],
  ["WhatsApp", "whatsapp", "+22.8%"],
  ["Broadcasts", "broadcasts", "+12.1%"],
  ["SMS", "sms", "−3.6%"],
  ["Email", "email", "+8.4%"],
  ["Conversations", "conversations", "+14.2%"],
] as const;

export default function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const { customers: apiCustomers, loading } = useCustomerAnalytics();
  const [tab, setTab] = useState("overview");
  const [offering, setOffering] = useState<Offering | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const rawCustomer = useMemo(() => {
    return (
      apiCustomers.find((item) => item.id === params.id) ||
      fallbackCustomers.find((item) => item.id === params.id) ||
      null
    );
  }, [apiCustomers, params.id]);

  const { profile } = useCustomerProfile(rawCustomer?.id);

  interface CustomerOperationsPayload {
    activities: CustomerActivity[];
    products: Offering[];
    deals: {
      id: string;
      sourceDealId: string;
      name: string;
      title: string;
      value: number;
      formattedValue: string;
      currency: string;
      probability: number;
      stage: string;
      status: string;
      pipelineName: string;
      owner: string;
      createdDate: string;
      lastActivityDate: string;
    }[];
    tasks: {
      id: string;
      sourceTaskId: string;
      title: string;
      description: string;
      status: string;
      priority: string;
      dueDate: string;
      createdBy: string;
      createdDate: string;
    }[];
    tickets: {
      id: string;
      sourceTicketId: string;
      title: string;
      description: string;
      category: string;
      priority: string;
      status: string;
      createdBy: string;
      createdDate: string;
      replies: {
        id: string;
        userName: string;
        message: string;
        createdAt: string;
      }[];
    }[];
    groups: {
      id: string;
      sourceGroupId: string;
      name: string;
      channels?: string | null;
      totalCount: number;
      createdDate: string;
    }[];
  }

  const [realOperations, setRealOperations] = useState<CustomerOperationsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!rawCustomer?.id) {
      setRealOperations(null);
      return;
    }

    const customerId = rawCustomer.id;
    const customerName = rawCustomer.company || "";

    fetch(
      `/api/customer-operations?customerId=${encodeURIComponent(customerId)}&customerName=${encodeURIComponent(customerName)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.success) {
          setRealOperations(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch customer operations:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [rawCustomer?.id, rawCustomer?.company]);

  const customer = useMemo(() => {
    if (!rawCustomer) return null;

    let company = rawCustomer.company;
    let contact = { ...rawCustomer.contact };
    let industry = rawCustomer.industry;
    let region = rawCustomer.region;
    let plan = rawCustomer.plan;
    let activatedAt = rawCustomer.activatedAt;
    let lastActivity = rawCustomer.lastActivity;
    let subscription = { ...rawCustomer.subscription };
    let usage = { ...rawCustomer.usage };
    let owner = { ...rawCustomer.owner };

    if (profile) {
      if (profile.company_name || profile.business_name) {
        company = (profile.company_name || profile.business_name || company).trim();
      }
      if (profile.full_name || profile.user_name) {
        contact.name = (profile.full_name || profile.user_name || contact.name).trim();
      }
      if (profile.email || profile.user_email) {
        contact.email = (profile.email || profile.user_email || contact.email).trim();
      }
      if (profile.phone || profile.company_phone || profile.business_phone) {
        contact.phone = (
          profile.phone ||
          profile.company_phone ||
          profile.business_phone ||
          contact.phone
        ).trim();
      }
      if (profile.industry || profile.company_industry || profile.selected_industry) {
        const ind = (
          profile.industry ||
          profile.company_industry ||
          profile.selected_industry ||
          ""
        ).trim();
        if (ind) {
          industry = ind.charAt(0).toUpperCase() + ind.slice(1);
        }
      }
      if (
        profile.location ||
        profile.company_location ||
        profile.address ||
        profile.company_address
      ) {
        region = (
          profile.location ||
          profile.company_location ||
          profile.address ||
          profile.company_address ||
          region
        ).trim();
      }
      if (profile.plan || profile.user_plan) {
        const p = (profile.plan || profile.user_plan || "").trim();
        if (p) {
          plan = p.charAt(0).toUpperCase() + p.slice(1);
        }
      }
      if (profile.created_at || profile.createdAt || profile.member_since) {
        activatedAt = formatActivatedDate(
          profile.created_at || profile.createdAt || profile.member_since
        );
        subscription.startDate = activatedAt;
      }
      if (profile.last_login || profile.lastLogin || profile.updated_at) {
        lastActivity = formatLastActive(
          profile.last_login || profile.lastLogin || profile.updated_at
        );
      }
      if (profile.message_volume) {
        const vol = parseInt(profile.message_volume, 10);
        if (!isNaN(vol) && vol > 0) {
          usage.messages = vol;
          usage.whatsapp = vol;
        }
      }
      if (profile.role || profile.user_role) {
        owner.name = (profile.role || profile.user_role || owner.name).trim();
        owner.initials = getInitials(owner.name);
      }
    }

    let activities = rawCustomer.activities || [];
    let offerings = rawCustomer.offerings || [];
    let notes = rawCustomer.notes || [];
    let invoices = rawCustomer.invoices || [];

    if (realOperations) {
      // 1. Activities
      if (Array.isArray(realOperations.activities) && realOperations.activities.length > 0) {
        activities = realOperations.activities;
      } else {
        activities = [];
      }

      // 2. Products / Offerings
      if (Array.isArray(realOperations.products) && realOperations.products.length > 0) {
        offerings = realOperations.products;
      } else {
        offerings = [];
      }

      // 3. Tasks & Tickets -> Notes
      const taskNotes: Note[] = (realOperations.tasks || []).map((t) => {
        const prio: Note["priority"] =
          t.priority?.toLowerCase() === "high"
            ? "High"
            : t.priority?.toLowerCase() === "low"
            ? "Low"
            : "Medium";
        return {
          id: t.sourceTaskId || t.id,
          title: t.title || "Operational Task",
          content: `Status: ${t.status} · Due: ${t.dueDate}\n${t.description}`,
          category: "Technical",
          priority: prio,
          createdBy: t.createdBy || "SuperBlock Admin",
          createdDate: t.createdDate || "—",
          updatedAt: t.dueDate !== "—" ? t.dueDate : t.createdDate || "—",
        };
      });

      const ticketNotes: Note[] = (realOperations.tickets || []).map((tk) => {
        const prio: Note["priority"] =
          tk.priority?.toLowerCase() === "high"
            ? "High"
            : tk.priority?.toLowerCase() === "low"
            ? "Low"
            : "Medium";
        const repliesText =
          tk.replies && tk.replies.length > 0
            ? "\n\nReplies:\n" +
              tk.replies
                .map((r) => `• ${r.userName} (${r.createdAt}): ${r.message}`)
                .join("\n")
            : "";
        return {
          id: tk.sourceTicketId || tk.id,
          title: `[Support #${tk.sourceTicketId}] ${tk.title}`,
          content: `${tk.description}${repliesText}`,
          category: "Support",
          priority: prio,
          createdBy: tk.createdBy || "Customer",
          createdDate: tk.createdDate || "—",
          updatedAt:
            tk.replies?.[tk.replies.length - 1]?.createdAt || tk.createdDate || "—",
        };
      });

      const dbNotes: Note[] = ((realOperations as any).notes || []).map((n: any) => ({
        id: n.id,
        title: n.title || "Customer Note",
        content: n.content || "",
        category: "General",
        priority: "Medium" as const,
        createdBy: n.createdBy || "Team Member",
        createdDate: n.createdDate || "—",
        updatedAt: n.updatedAt || n.createdDate || "—",
      }));

      const combinedNotes = [...dbNotes, ...taskNotes, ...ticketNotes];
      if (combinedNotes.length > 0) {
        notes = combinedNotes;
      } else {
        notes = [];
      }

      // 4. Deals -> Invoices & Commercial Terms
      if (Array.isArray(realOperations.deals) && realOperations.deals.length > 0) {
        invoices = realOperations.deals.map((deal) => {
          const isWon =
            deal.status?.toLowerCase() === "won" ||
            deal.stage?.toLowerCase() === "won";
          const isLost =
            deal.status?.toLowerCase() === "lost" ||
            deal.stage?.toLowerCase() === "lost";
          const invoiceStatus: Invoice["status"] = isWon
            ? "Paid"
            : isLost
            ? "Cancelled"
            : "Sent";
          const val = deal.value || 0;
          return {
            id: deal.sourceDealId || deal.id,
            date: deal.createdDate || "—",
            dueDate: deal.lastActivityDate || deal.createdDate || "—",
            product: `${deal.title}${deal.pipelineName ? " (" + deal.pipelineName + ")" : ""}`,
            amount: val,
            tax: 0,
            total: val,
            status: invoiceStatus,
            paymentDate: isWon
              ? deal.lastActivityDate || deal.createdDate
              : undefined,
          };
        });

        const wonSum = realOperations.deals
          .filter(
            (d) =>
              d.status?.toLowerCase() === "won" ||
              d.stage?.toLowerCase() === "won"
          )
          .reduce((sum, d) => sum + (d.value || 0), 0);

        const totalSum = realOperations.deals.reduce(
          (sum, d) => sum + (d.value || 0),
          0
        );

        if (wonSum > 0) {
          subscription.contractValue = wonSum;
          subscription.mrr = Math.round(wonSum / 12);
          subscription.paymentStatus = "Current";
          subscription.status = "Active";
        } else if (totalSum > 0) {
          subscription.contractValue = totalSum;
          subscription.mrr = Math.round(totalSum / 12);
          subscription.paymentStatus = "Current";
          subscription.status = "Active";
        }
      } else {
        invoices = [];
      }
    }

    return {
      ...rawCustomer,
      company,
      initials: getInitials(company),
      contact,
      industry,
      region,
      plan,
      activatedAt,
      lastActivity,
      subscription,
      usage,
      owner,
      activities,
      offerings,
      notes,
      invoices,
    };
  }, [rawCustomer, profile, realOperations]);

  const exportCustomer = () => {
    if (!customer) return;
    downloadCsv(`${customer.company.toLowerCase().replace(/\s/g, "-")}.csv`, [
      {
        ID: customer.id,
        Company: customer.company,
        Status: customer.status,
        Plan: customer.plan,
        Contacts: customer.usage.contacts || 0,
        MRR: customer.subscription.mrr,
        Messages: customer.usage.messages,
        Health: customer.health.score,
      },
    ]);
    toast.success("Customer profile exported");
  };

  if (loading && !customer) {
    return (
      <AppShell breadcrumbs={["Customers", "Loading..."]}>
        <div className="flex h-[400px] flex-col items-center justify-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading customer details…</p>
        </div>
      </AppShell>
    );
  }

  if (!customer) {
    return (
      <AppShell breadcrumbs={["Customers", "Not Found"]}>
        <div className="panel flex h-[350px] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="rounded-full bg-muted/60 p-3">
            <UserRound className="size-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Customer record not found</h2>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              No matching customer profile was found for identifier{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                {params.id}
              </code>
              .
            </p>
          </div>
          <Link href="/customers">
            <Button size="sm" variant="outline" className="gap-1.5">
              <ArrowLeft className="size-3.5" /> Back to Customers
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={["Customers", customer.company]}>
      <Link
        href="/customers"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to customers
      </Link>
      <div className="customer-hero">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <Avatar
            initials={customer.initials}
            size="lg"
            className="bg-foreground text-background"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.035em]">
                {customer.company}
              </h1>
              <StatusBadge status={customer.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
              <span>ID: {customer.id}</span>
              {customer.industry !== "—" && <span>{customer.industry}</span>}
              {customer.region !== "—" && <span>{customer.region}</span>}
              {customer.industry === "—" && customer.region === "—" && (
                <span>Pending business portfolio configuration</span>
              )}
              <span>Activated {customer.activatedAt}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="mini-info">
                <span>Plan</span>
                <b>{customer.plan}</b>
              </span>
              {customer.usage.contacts && customer.usage.contacts > 0 ? (
                <span className="mini-info">
                  <span>CRM Contacts</span>
                  <b>{formatNumber(customer.usage.contacts)}</b>
                </span>
              ) : null}
              {(customer.contact.name !== "—" || customer.contact.email !== "—") && (
                <span className="mini-info">
                  <span>Contact</span>
                  <b>
                    {customer.contact.name !== "—"
                      ? customer.contact.name
                      : customer.contact.email}
                  </b>
                </span>
              )}
              <span className="mini-info">
                <span>Renewal</span>
                <b>{customer.renewal}</b>
              </span>
              <span className="mini-info">
                <span>Last active</span>
                <b>{customer.lastActivity}</b>
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <QuickFormDialog
            type="note"
            title="Add note"
            description={`Add internal context for ${customer.company}.`}
            trigger={
              <Button variant="outline" size="sm" className="bg-card">
                <MessageSquarePlus className="size-3.5" />
                Add note
              </Button>
            }
          />
          <QuickFormDialog
            type="meeting"
            title="Add meeting"
            description={`Record a new customer meeting for ${customer.company}.`}
            trigger={
              <Button variant="outline" size="sm" className="bg-card">
                <CalendarPlus className="size-3.5" />
                Add meeting
              </Button>
            }
          />
          <QuickFormDialog
            type="customer"
            title="Edit customer"
            description={`Update details and configuration for ${customer.company}.`}
            defaultValues={{
              name: customer.company,
              email: customer.contact.email !== "—" ? customer.contact.email : "",
              plan: ["starter", "growth", "advanced"].includes(customer.plan.toLowerCase())
                ? customer.plan.toLowerCase()
                : "growth",
              description: customer.industry && customer.industry !== "—" ? customer.industry : "",
            }}
            trigger={
              <Button size="sm">
                <Edit3 className="size-3.5" />
                Edit customer
              </Button>
            }
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-8 bg-card">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTab("billing")}>
                Manage subscription
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTab("billing")}>
                View invoices
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCustomer}>
                <Download className="size-3.5" />
                Export customer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600"
                onClick={() => toast.success("Account access suspended")}
              >
                Suspend account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <div className="overflow-x-auto border-b">
          <TabsList className="h-10 w-max justify-start rounded-none bg-transparent p-0">
            {[
              "overview",
              "usage",
              "offerings",
              "notes",
              "meetings",
              "credentials",
              "billing",
              "activity",
            ].map((item) => (
              <TabsTrigger
                key={item}
                value={item}
                className="h-10 rounded-none border-b-2 border-transparent px-3 text-[12px] capitalize shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="mt-4">
          <Overview customer={customer} setTab={setTab} />
        </TabsContent>
        <TabsContent value="usage" className="mt-4">
          <Usage customer={customer} />
        </TabsContent>
        <TabsContent value="offerings" className="mt-4">
          <Offerings customer={customer} onOpen={setOffering} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <Notes key={customer.id} customer={customer} />
        </TabsContent>
        <TabsContent value="meetings" className="mt-4">
          <Meetings key={customer.id} customer={customer} />
        </TabsContent>
        <TabsContent value="credentials" className="mt-4">
          <Credentials customer={customer} />
        </TabsContent>
        <TabsContent value="billing" className="mt-4">
          <Billing customer={customer} onInvoice={setInvoice} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTimeline customer={customer} />
        </TabsContent>
      </Tabs>

      <OfferingDrawer
        offering={offering}
        onOpenChange={(open) => !open && setOffering(null)}
      />
      <InvoiceDialog
        invoice={invoice}
        customer={customer}
        onOpenChange={(open) => !open && setInvoice(null)}
      />
    </AppShell>
  );
}

function Overview({
  customer,
  setTab,
}: {
  customer: Customer;
  setTab: (tab: string) => void;
}) {
  const healthParts = [
    { label: "Adoption", value: customer.health.score > 0 ? 96 : 0 },
    { label: "Engagement", value: customer.health.score > 0 ? 91 : 0 },
    { label: "Support", value: customer.health.score > 0 ? 86 : 0 },
    {
      label: "Payment",
      value:
        customer.subscription.paymentStatus === "Current"
          ? 100
          : customer.subscription.paymentStatus === "—"
          ? 0
          : 40,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {overviewMetrics.map(([label, key, trend]) => {
          const val = customer.usage[key];
          return (
            <div className="metric-card" key={label}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {label}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="font-tabular text-[21px] font-semibold tracking-[-0.035em]">
                  {val > 0 ? formatNumber(val) : "0"}
                </div>
                {val > 0 ? (
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      trend.startsWith("−") ? "text-rose-600" : "text-emerald-600"
                    )}
                  >
                    {trend}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="panel p-4">
          <SectionHeader
            title="Usage momentum"
            description={
              customer.usage.messages > 0
                ? "Cross-channel engagement for the last 30 days"
                : "No historical message activity recorded"
            }
            action={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setTab("usage")}
              >
                View usage <ChevronRight className="size-3" />
              </Button>
            }
          />
          {customer.usage.messages > 0 ? (
            <div className="h-[255px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analyticsSeries.map((row, index) => ({
                    date: row.date,
                    usage: Math.round(
                      (customer.usage.messages / 8 / 1000) * (0.72 + index * 0.05)
                    ),
                    responses: Math.round(
                      (customer.usage.conversations / 8) * (0.75 + index * 0.04)
                    ),
                  }))}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="customerUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0"
                        stopColor="var(--chart-1)"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="1"
                        stopColor="var(--chart-1)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--chart-grid)"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  />
                  <RechartsTooltip content={<SimpleTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="usage"
                    name="Messages (k)"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#customerUsage)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="responses"
                    name="Conversations"
                    stroke="var(--chart-3)"
                    strokeWidth={1.8}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[255px] flex-col items-center justify-center text-center text-muted-foreground">
              <Activity className="mb-2 size-8 opacity-40" />
              <span className="text-xs font-medium">No operational message logs</span>
              <span className="mt-1 max-w-xs text-[11px] text-muted-foreground/70">
                {customer.usage.contacts && customer.usage.contacts > 0
                  ? `${formatNumber(customer.usage.contacts)} CRM contacts provisioned in public.customer_contacts.`
                  : "Message and channel activity will appear once communication events are logged."}
              </span>
            </div>
          )}
        </div>
        <div className="panel p-4">
          <SectionHeader
            title="Customer health"
            description="Operational indicators, not AI predictions"
            action={<StatusBadge status={customer.health.status || customer.status} />}
          />
          {customer.health.score > 0 ? (
            <>
              <div className="flex items-center gap-5 border-b pb-4">
                <div
                  className={cn(
                    "grid size-20 place-items-center rounded-full border-[7px] font-tabular text-2xl font-semibold",
                    customer.health.score >= 75
                      ? "border-emerald-100 text-emerald-700 dark:border-emerald-950 dark:text-emerald-300"
                      : "border-amber-100 text-amber-700"
                  )}
                >
                  {customer.health.score}
                </div>
                <div>
                  <div className="text-sm font-semibold">{customer.health.status}</div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Usage trend: {customer.health.usageTrend}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Login frequency: {customer.health.loginFrequency}
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {healthParts.map((part) => (
                  <div key={part.label}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-muted-foreground">{part.label}</span>
                      <span className="font-tabular font-semibold">{part.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground"
                        style={{ width: `${part.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[255px] flex-col items-center justify-center text-center text-muted-foreground">
              <div className="grid size-16 place-items-center rounded-full border border-dashed text-sm font-medium">
                —
              </div>
              <div className="mt-3 text-xs font-semibold">Health metrics pending</div>
              <p className="mt-1 max-w-[240px] text-[11px] text-muted-foreground/70">
                Health score calculates automatically once ongoing usage and operational interactions are established.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Snapshot
          title="Subscription"
          action={() => setTab("billing")}
          rows={[
            ["Current plan", customer.plan || "—"],
            [
              "MRR",
              customer.subscription.mrr > 0
                ? formatCurrency(customer.subscription.mrr)
                : "—",
            ],
            ["Renewal", customer.subscription.renewalDate || "—"],
            ["Payment", customer.subscription.paymentStatus || "—"],
          ]}
        />
        <Snapshot
          title="Offerings"
          action={() => setTab("offerings")}
          rows={
            customer.offerings && customer.offerings.length > 0
              ? customer.offerings.map((item) => [item.name, item.status]).slice(0, 4)
              : [
                  ["Active offerings", "None provisioned"],
                  ["Status", "—"],
                ]
          }
        />
        <Snapshot
          title="Recent context"
          action={() => setTab("notes")}
          rows={[
            [
              "CRM Contacts",
              customer.usage.contacts
                ? formatNumber(customer.usage.contacts)
                : "—",
            ],
            ["Last meeting", customer.meetings?.[0]?.date || "—"],
            ["Open notes", String(customer.notes?.length || 0)],
            ["Next follow-up", customer.meetings?.[0]?.followUp || "—"],
          ]}
        />
      </div>
    </div>
  );
}

function Snapshot({
  title,
  rows,
  action,
}: {
  title: string;
  rows: string[][];
  action: () => void;
}) {
  return (
    <div className="panel p-4">
      <SectionHeader
        title={title}
        action={
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={action}>
            Open <ChevronRight className="size-3" />
          </Button>
        }
      />
      <div className="divide-y divide-border/60">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 py-2.5 text-[12px]"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Usage({ customer }: { customer: Customer }) {
  const [range, setRange] = useState("Last 30 days");
  const channels = [
    {
      name: "WhatsApp",
      value: customer.usage.whatsapp,
      color: "var(--whatsapp)",
      detail:
        customer.usage.whatsapp > 0
          ? "97.8% delivered · 72.4% read"
          : "0 messages sent",
    },
    {
      name: "Email",
      value: customer.usage.email,
      color: "var(--email)",
      detail:
        customer.usage.email > 0
          ? "96.1% delivered · 38.7% opened"
          : "0 emails sent",
    },
    {
      name: "SMS",
      value: customer.usage.sms,
      color: "var(--sms)",
      detail:
        customer.usage.sms > 0
          ? "94.8% delivered · 1.9% failed"
          : "0 SMS sent",
    },
    {
      name: "Broadcast",
      value: customer.usage.broadcasts * 1000,
      color: "var(--broadcast)",
      detail:
        customer.usage.broadcasts > 0
          ? `${customer.usage.broadcasts} campaigns · 68.2% read`
          : "0 campaigns run",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Customer usage</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Detailed product and channel consumption for {customer.company}.
          </p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="h-8 w-[145px] bg-card text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Last 7 days", "Last 30 days", "This quarter", "This year"].map(
              (item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {customer.usage.contacts && customer.usage.contacts > 0 ? (
        <div className="panel flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg border bg-muted/40 font-semibold text-primary">
              <UserRound className="size-4" />
            </span>
            <div>
              <div className="text-xs font-semibold">Audience & CRM Contacts</div>
              <div className="text-[11px] text-muted-foreground">
                Verified operational contacts recorded in SuperBlock Analytics Studio (
                <code className="rounded bg-muted px-1 font-mono text-[10px]">
                  public.customer_contacts
                </code>
                ).
              </div>
            </div>
          </div>
          <div className="font-tabular text-xl font-bold tracking-tight">
            {formatNumber(customer.usage.contacts)}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              contacts
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {channels.map((channel) => (
          <div className="metric-card" key={channel.name}>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ background: channel.color }}
              />
              {channel.name}
            </div>
            <div className="mt-3 font-tabular text-2xl font-semibold">
              {formatNumber(channel.value)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {channel.detail}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="panel p-4">
          <SectionHeader
            title="Channel usage trend"
            description={`${range} · thousands of events`}
          />
          {customer.usage.messages > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analyticsSeries}
                  margin={{ top: 10, right: 5, left: -22, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--chart-grid)"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  />
                  <RechartsTooltip content={<SimpleTooltip suffix="k" />} />
                  <Area
                    dataKey="whatsapp"
                    name="WhatsApp"
                    type="monotone"
                    stroke="var(--whatsapp)"
                    fill="var(--whatsapp)"
                    fillOpacity={0.08}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="email"
                    name="Email"
                    type="monotone"
                    stroke="var(--email)"
                    strokeWidth={1.8}
                    dot={false}
                  />
                  <Line
                    dataKey="sms"
                    name="SMS"
                    type="monotone"
                    stroke="var(--sms)"
                    strokeWidth={1.8}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center text-center text-muted-foreground">
              <Activity className="mb-2 size-8 opacity-40" />
              <span className="text-xs font-medium">
                No channel usage events in this period
              </span>
              <p className="mt-1 max-w-xs text-[11px] text-muted-foreground/70">
                Channel time-series analytics will populate as customer broadcasts, conversations, and automated workflows are dispatched.
              </p>
            </div>
          )}
        </div>
        <div className="panel p-4">
          <SectionHeader
            title="Product consumption"
            description="Usage against contracted limits"
          />
          <div className="space-y-4">
            {[
              [
                "Messages",
                customer.usage.messages > 0 ? 78 : 0,
                formatNumber(customer.usage.messages),
                "1.25M",
              ],
              [
                "Automation executions",
                customer.usage.automations > 0 ? 66 : 0,
                formatNumber(customer.usage.automations),
                "2.5K",
              ],
              [
                "API requests",
                customer.usage.api > 0 ? 84 : 0,
                formatNumber(customer.usage.api),
                "2.2M",
              ],
              [
                "Storage",
                customer.usage.storage > 0 ? 42 : 0,
                `${customer.usage.storage} GB`,
                "100 GB",
              ],
            ].map(([label, percent, value, limit]) => (
              <div key={label as string}>
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span>{label}</span>
                  <span className="font-tabular text-muted-foreground">
                    {value} / {limit}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      Number(percent) > 80 ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="p-4 pb-2">
          <SectionHeader
            title="Usage breakdown"
            description="Channel quality and outcome metrics"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[780px]">
            <thead>
              <tr>
                <th>Channel</th>
                <th className="text-right">Sent</th>
                <th className="text-right">Delivered</th>
                <th className="text-right">Engaged</th>
                <th className="text-right">Failed</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((channel, index) => (
                <tr key={channel.name}>
                  <td className="font-medium">{channel.name}</td>
                  <td className="text-right font-tabular">
                    {formatNumber(channel.value)}
                  </td>
                  <td className="text-right font-tabular">
                    {channel.value > 0
                      ? formatNumber(Math.round(channel.value * (0.95 + index * 0.005)))
                      : "0"}
                  </td>
                  <td className="text-right font-tabular">
                    {channel.value > 0
                      ? formatNumber(Math.round(channel.value * (0.37 + index * 0.06)))
                      : "0"}
                  </td>
                  <td className="text-right font-tabular">
                    {channel.value > 0
                      ? formatNumber(Math.round(channel.value * 0.022))
                      : "0"}
                  </td>
                  <td>
                    {channel.value > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <TrendingUp className="size-3" />+{8 + index * 3}.2%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Offerings({
  customer,
  onOpen,
}: {
  customer: Customer;
  onOpen: (offering: Offering) => void;
}) {
  const offerings = customer.offerings || [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Offerings</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Products and services currently provisioned for this customer.
          </p>
        </div>
        <QuickFormDialog
          title="Add offering"
          description={`Provision a new offering for ${customer.company}.`}
          trigger={
            <Button size="sm">
              <Plus className="size-3.5" />
              Add offering
            </Button>
          }
        />
      </div>
      {offerings.length === 0 ? (
        <div className="panel flex flex-col items-center justify-center p-12 text-center">
          <PackageOpen className="mb-3 size-8 text-muted-foreground/40" />
          <h3 className="text-sm font-semibold">No offerings provisioned</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            No dedicated product offerings or add-on packages are currently associated with {customer.company}.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {offerings.map((item) => (
            <button
              key={item.id}
              onClick={() => onOpen(item)}
              className="panel group p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-lg border bg-muted/35">
                  <PackageSymbol name={item.name} />
                </span>
                <StatusBadge status={item.status} />
              </div>
              <h3 className="mt-4 text-sm font-semibold group-hover:underline">
                {item.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground">
                {item.description}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-y-3 border-t pt-3 text-[11px]">
                <div>
                  <span className="block text-muted-foreground">Quantity</span>
                  <b className="mt-0.5 block font-medium">{item.quantity}</b>
                </div>
                <div>
                  <span className="block text-muted-foreground">Pricing</span>
                  <b className="mt-0.5 block font-medium">{item.pricing}</b>
                </div>
                <div>
                  <span className="block text-muted-foreground">Started</span>
                  <b className="mt-0.5 block font-medium">{item.startDate}</b>
                </div>
                <div>
                  <span className="block text-muted-foreground">Owner</span>
                  <b className="mt-0.5 block font-medium">{item.owner}</b>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Notes({ customer }: { customer: Customer }) {
  const [notes, setNotes] = useState<Note[]>(customer.notes || []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");

  useEffect(() => {
    setNotes(customer.notes || []);
  }, [customer.notes, customer.id]);

  const filtered = notes.filter(
    (note) =>
      `${note.title} ${note.content}`.toLowerCase().includes(query.toLowerCase()) &&
      (category === "All categories" || note.category === category)
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Internal notes</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Operational context shared across customer-facing teams.
          </p>
        </div>
        <QuickFormDialog
          type="note"
          title="Add note"
          description="Document customer context for internal teams."
          trigger={
            <Button size="sm">
              <Plus className="size-3.5" />
              Add note
            </Button>
          }
        />
      </div>
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "All categories",
                "General",
                "Sales",
                "Support",
                "Billing",
                "Technical",
                "Renewal",
                "Important",
              ].map((item) => (
                <SelectItem value={item} key={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <FileText className="mb-2 size-8 opacity-40" />
            <div className="text-xs font-medium">No notes recorded</div>
            <p className="mt-1 max-w-xs text-[11px] text-muted-foreground/70">
              {notes.length === 0
                ? `No internal relationship notes have been created for ${customer.company}.`
                : "No notes matched your search query or filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                onDelete={() => {
                  setNotes(notes.filter((item) => item.id !== note.id));
                  toast.success("Note deleted");
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteRow({ note, onDelete }: { note: Note; onDelete: () => void }) {
  return (
    <div className="p-4 hover:bg-muted/20">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border bg-muted/40">
          <FileText className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-semibold">{note.title}</h3>
            <StatusBadge
              status={
                note.priority === "High"
                  ? "Renewal Due"
                  : note.priority === "Medium"
                  ? "Trial"
                  : "Active"
              }
              dot={false}
            />
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {note.category}
            </span>
          </div>
          <p className="mt-2 max-w-4xl text-[12px] leading-5 text-muted-foreground">
            {note.content}
          </p>
          <div className="mt-2 font-mono text-[10px] text-muted-foreground">
            {note.createdBy} · {note.createdDate} · Updated {note.updatedAt}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast.success("Note edit mode opened")}>
              <Edit3 className="size-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600" onClick={onDelete}>
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function Meetings({ customer }: { customer: Customer }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const meetings = customer.meetings || [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Meeting minutes</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Decisions, follow-ups, and customer commitments over time.
          </p>
        </div>
        <QuickFormDialog
          type="meeting"
          title="Add meeting"
          description="Record a meeting and assign follow-up actions."
          trigger={
            <Button size="sm">
              <Plus className="size-3.5" />
              Add meeting
            </Button>
          }
        />
      </div>
      {meetings.length === 0 ? (
        <div className="panel flex flex-col items-center justify-center p-12 text-center">
          <CalendarPlus className="mb-3 size-8 text-muted-foreground/40" />
          <h3 className="text-sm font-semibold">No meetings recorded</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            No meeting minutes or appointments have been logged for {customer.company}.
          </p>
        </div>
      ) : (
        <div className="relative space-y-3 before:absolute before:bottom-6 before:left-[17px] before:top-6 before:w-px before:bg-border">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="relative flex gap-4">
              <span className="z-10 mt-5 grid size-9 shrink-0 place-items-center rounded-full border bg-background">
                <CalendarPlus className="size-3.5" />
              </span>
              <div className="panel flex-1 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{meeting.title}</h3>
                      <StatusBadge
                        status={
                          completed.includes(meeting.id) ? "Completed" : meeting.status
                        }
                      />
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {meeting.date} · Owner {meeting.owner}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => toast.success("Meeting detail opened")}
                      >
                        View meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toast.success("Meeting edit mode opened")}
                      >
                        Edit meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setCompleted([...completed, meeting.id]);
                          toast.success("Actions marked complete");
                        }}
                      >
                        <Check className="size-3.5" />
                        Mark complete
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-rose-600">
                        Delete meeting
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
                  {meeting.summary}
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-muted/35 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Key decision
                    </div>
                    <p className="mt-1 text-[12px] leading-5">{meeting.decisions}</p>
                  </div>
                  <div className="rounded-lg bg-muted/35 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Action items
                    </div>
                    <div className="mt-1.5 space-y-1.5">
                      {meeting.actionItems.map((item) => (
                        <div className="flex items-center gap-2 text-[11px]" key={item}>
                          <span className="size-1.5 rounded-full bg-primary" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  <span>Participants: {meeting.participants.join(", ")}</span>
                  <span>Due {meeting.dueDate}</span>
                  <span>Follow-up {meeting.followUp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Credentials({ customer }: { customer: Customer }) {
  const [visible, setVisible] = useState<string[]>([]);
  const credentials = customer.credentials || [];

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold">Customer credentials</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Restricted internal access information. Passwords remain masked by default.
        </p>
      </div>
      {credentials.length === 0 ? (
        <div className="panel flex flex-col items-center justify-center p-12 text-center">
          <KeyRound className="mb-3 size-8 text-muted-foreground/40" />
          <h3 className="text-sm font-semibold">No credentials stored</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            No system access credentials or integration secrets are configured for {customer.company}.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-200">
            <KeyRound className="mt-0.5 size-4 shrink-0" />
            <div className="text-[11px] leading-5">
              <b>Handle with care.</b> Access information is restricted to authorized team members.
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {credentials.map((credential) => {
              const shown = visible.includes(credential.id);
              return (
                <div className="panel p-4" key={credential.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg border bg-muted/35">
                        <KeyRound className="size-3.5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold">{credential.type}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Updated {credential.updatedAt}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status="Active" />
                  </div>
                  <div className="mt-4 divide-y rounded-lg border">
                    <CredentialRow
                      label="Username"
                      value={credential.username}
                      action={<CopyButton value={credential.username} />}
                    />
                    <CredentialRow
                      label="Login URL"
                      value={credential.loginUrl}
                      action={<CopyButton value={credential.loginUrl} />}
                    />
                    <CredentialRow
                      label="Password"
                      value={shown ? credential.password : "••••••••••••••"}
                      mono
                      action={
                        <div className="flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() =>
                              setVisible((items) =>
                                shown
                                  ? items.filter((id) => id !== credential.id)
                                  : [...items, credential.id]
                              )
                            }
                          >
                            {shown ? (
                              <EyeOff className="size-3.5" />
                            ) : (
                              <Eye className="size-3.5" />
                            )}
                          </Button>
                          <CopyButton value={credential.password} />
                        </div>
                      }
                    />
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                    {credential.notes}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CredentialRow({
  label,
  value,
  action,
  mono,
}: {
  label: string;
  value: string;
  action: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-h-10 items-center gap-3 px-3">
      <span className="w-20 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[11px]",
          mono && "font-mono tracking-wider"
        )}
      >
        {value}
      </span>
      {action}
    </div>
  );
}

function Billing({
  customer,
  onInvoice,
}: {
  customer: Customer;
  onInvoice: (invoice: Invoice) => void;
}) {
  const invoices = customer.invoices || [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <div className="panel p-4">
          <SectionHeader
            title="Current subscription"
            description="Commercial and renewal terms"
            action={
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={() => toast.success("Subscription manager opened")}
              >
                Manage subscription
              </Button>
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-foreground p-4 text-background">
              <div className="text-[10px] uppercase tracking-wider opacity-60">
                Current plan
              </div>
              <div className="mt-2 text-xl font-semibold">{customer.plan || "—"}</div>
              <div className="mt-4 text-[11px] opacity-70">
                {customer.subscription.billingCycle} billing
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-5 sm:col-span-2">
              {[
                ["Status", customer.subscription.status || "—"],
                ["Payment", customer.subscription.paymentStatus || "—"],
                ["Start date", customer.subscription.startDate || "—"],
                ["Renewal date", customer.subscription.renewalDate || "—"],
                [
                  "MRR",
                  customer.subscription.mrr > 0
                    ? formatCurrency(customer.subscription.mrr)
                    : "—",
                ],
                [
                  "Contract value",
                  customer.subscription.contractValue > 0
                    ? formatCurrency(customer.subscription.contractValue)
                    : "—",
                ],
              ].map(([label, value]) => (
                <div key={label} className="border-b py-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {label}
                  </div>
                  <div className="mt-1 text-xs font-medium">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="panel p-4">
          <SectionHeader
            title="Revenue history"
            description="Rolling billed revenue"
          />
          {customer.subscription.mrr > 0 ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map(
                    (month, index) => ({
                      month,
                      revenue: customer.subscription.mrr * (0.82 + index * 0.04),
                    })
                  )}
                  margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--chart-grid)"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                  />
                  <RechartsTooltip content={<SimpleTooltip currency />} />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[180px] flex-col items-center justify-center text-center text-muted-foreground">
              <span className="text-xs font-medium">No billed revenue</span>
              <span className="mt-1 text-[11px] text-muted-foreground/70">
                Billed transactions will appear once invoices are generated.
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-2">
          <SectionHeader
            title="Invoices"
            description={
              invoices.length > 0
                ? `${invoices.length} invoices · ${formatCurrency(
                    invoices.reduce((sum, item) => sum + item.total, 0)
                  )} lifetime billed`
                : "0 invoices · ₹0 billed"
            }
          />
          {invoices.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 bg-card text-xs"
              onClick={() => toast.success("Invoice export ready")}
            >
              <Download className="size-3.5" />
              Export
            </Button>
          )}
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No invoices generated for this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Due date</th>
                  <th>Product</th>
                  <th className="text-right">Subtotal</th>
                  <th className="text-right">Tax</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono text-[11px]">{item.id}</td>
                    <td>{item.date}</td>
                    <td>{item.dueDate}</td>
                    <td>{item.product}</td>
                    <td className="text-right font-tabular">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="text-right font-tabular">
                      {formatCurrency(item.tax)}
                    </td>
                    <td className="text-right font-tabular font-medium">
                      {formatCurrency(item.total)}
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => onInvoice(item)}
                      >
                        View <ChevronRight className="size-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityTimeline({ customer }: { customer: Customer }) {
  const [filter, setFilter] = useState("All activity");
  const activities = customer.activities || [];
  const rows =
    filter === "All activity"
      ? activities
      : activities.filter((item) => item.type === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">All activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A chronological record of every customer operation.
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-8 w-[150px] bg-card text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All activity", "Broadcast", "Login", "Note", "Meeting", "Invoice"].map(
              (item) => (
                <SelectItem value={item} key={item}>
                  {item}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="panel p-4">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <Activity className="mb-2 size-8 opacity-40" />
            <div className="text-xs font-medium">No activity recorded</div>
            <p className="mt-1 max-w-xs text-[11px] text-muted-foreground/70">
              {activities.length === 0
                ? `No event logs or operations recorded yet for ${customer.company}.`
                : `No activity found for category "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="relative before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-border">
            {rows.map((item, index) => (
              <div
                className="relative flex gap-4 pb-5 last:pb-0"
                key={item.id}
              >
                <span
                  className={cn(
                    "z-10 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border bg-background",
                    index === 0 && "border-primary/50 bg-primary/10"
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full bg-muted-foreground/40",
                      index === 0 && "bg-primary"
                    )}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-semibold">{item.title}</h3>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {item.type}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.detail}
                  </p>
                  <div className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                    {item.time} · {item.actor}
                    {item.channel ? ` · ${item.channel}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OfferingDrawer({
  offering,
  onOpenChange,
}: {
  offering: Offering | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={!!offering} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[470px]">
        <SheetHeader>
          <SheetTitle>{offering?.name}</SheetTitle>
          <SheetDescription>{offering?.description}</SheetDescription>
        </SheetHeader>
        {offering && (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border bg-muted/25 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Offering status
                </span>
                <StatusBadge status={offering.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                {[
                  ["Start date", offering.startDate],
                  ["Expiry date", offering.expiryDate],
                  ["Quantity", offering.quantity],
                  ["Pricing", offering.pricing],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {label}
                    </div>
                    <div className="mt-1 font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Internal notes
              </div>
              <p className="mt-2 text-xs leading-6">{offering.notes}</p>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned owner
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Avatar
                  initials={offering.owner
                    .split(" ")
                    .map((x) => x[0])
                    .join("")}
                  size="sm"
                />
                <span className="text-xs font-medium">{offering.owner}</span>
              </div>
            </div>
            <div className="flex gap-2 border-t pt-5">
              <Button
                className="flex-1"
                onClick={() => toast.success("Offering edit opened")}
              >
                Edit offering
              </Button>
              <Button
                variant="outline"
                className="flex-1 bg-card"
                onClick={() => toast.success("Offering paused")}
              >
                Pause offering
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InvoiceDialog({
  invoice,
  customer,
  onOpenChange,
}: {
  invoice: Invoice | null;
  customer: Customer;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Invoice {invoice?.id}</DialogTitle>
          <DialogDescription>
            {customer.company} · {invoice?.product}
          </DialogDescription>
        </DialogHeader>
        {invoice && (
          <div>
            <div className="rounded-xl bg-foreground p-5 text-background">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-60">
                    Total amount
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                    {formatCurrency(invoice.total)}
                  </div>
                </div>
                <StatusBadge status={invoice.status} />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-[11px]">
                <div>
                  <div className="opacity-50">Issued</div>
                  <div className="mt-1 font-medium">{invoice.date}</div>
                </div>
                <div>
                  <div className="opacity-50">Due</div>
                  <div className="mt-1 font-medium">{invoice.dueDate}</div>
                </div>
                <div>
                  <div className="opacity-50">Paid</div>
                  <div className="mt-1 font-medium">
                    {invoice.paymentDate || "—"}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 divide-y rounded-lg border text-xs">
              <div className="flex justify-between p-3">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-tabular">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-muted-foreground">Tax (18%)</span>
                <span className="font-tabular">{formatCurrency(invoice.tax)}</span>
              </div>
              <div className="flex justify-between p-3 font-semibold">
                <span>Total</span>
                <span className="font-tabular">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => toast.success("Invoice downloaded")}
              >
                <Download className="size-4" />
                Download PDF
              </Button>
              <Button
                onClick={() => toast.success("Invoice opened in a new view")}
              >
                Open invoice
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PackageSymbol({ name }: { name: string }) {
  return name.includes("AI") ? (
    <TrendingUp className="size-4" />
  ) : name.includes("Broadcast") ? (
    <MessageSquarePlus className="size-4" />
  ) : (
    <KeyRound className="size-4" />
  );
}

function SimpleTooltip({
  active,
  payload,
  label,
  suffix = "",
  currency = false,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  suffix?: string;
  currency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover p-2.5 shadow-lg">
      <div className="mb-1 text-[10px] text-muted-foreground">{label}</div>
      {payload.map((item) => (
        <div
          className="flex min-w-[130px] justify-between gap-3 text-[11px]"
          key={item.name}
        >
          <span>{item.name}</span>
          <b className="font-tabular">
            {currency
              ? formatCurrency(item.value)
              : item.value.toLocaleString("en-IN")}
            {suffix}
          </b>
        </div>
      ))}
    </div>
  );
}
