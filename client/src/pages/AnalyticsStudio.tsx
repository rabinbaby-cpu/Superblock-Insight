import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { fetchCustomerAnalytics } from "@/lib/api/customerAnalytics";
import { Link } from "wouter";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, ChevronRight, CircleDollarSign, MessageCircleMore, MoreHorizontal, RefreshCw, UsersRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AnalyticsToolbar, EmptyState, ErrorState, KpiCard, PageHeader, SectionHeader, StatusBadge, downloadCsv } from "@/components/dashboard-ui";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { analyticsSeries, conversationSeries, customers, kpis, recentActivity, formatCurrency, formatNumber } from "@/data/mockData";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const metricIcons = [UsersRound, UsersRound, MessageCircleMore, CircleDollarSign, Activity, RefreshCw];
const channelColors: Record<string, string> = { WhatsApp: "var(--whatsapp)", SMS: "var(--sms)", Email: "var(--email)", Broadcasts: "var(--broadcast)" };

type ChartState = "data" | "empty" | "error";

export default function AnalyticsStudio() {
  const { isRefreshing, refreshData } = useApp();

  // ============================================================================
  // TEMPORARY READ-ONLY TEST: Customer Analytics API
  // (Reuses shared customer analytics fetcher to prevent duplicate network calls)
  // ============================================================================
  useEffect(() => {
    async function testCustomerAnalytics() {
      console.log("🚀 [CustomerAnalytics Test] Starting API test...");
      try {
        const cognitoUser = await getCurrentUser().catch(() => null);
        const userId = cognitoUser?.userId || null;
        console.log("👤 [CustomerAnalytics Test] Current Cognito User ID:", userId);

        const data = await fetchCustomerAnalytics(isRefreshing);
        console.log("📡 [CustomerAnalytics Test] Request URL: https://api.superblock.chat/customeranalytics (Method: GET)");
        console.log(`✅ [CustomerAnalytics Test] Success response received (count: ${data?.count ?? data?.users?.length ?? 0}):`, data);
      } catch (err) {
        console.error("💥 [CustomerAnalytics Test] Fetch failed:", err);
      }
    }

    testCustomerAnalytics();

    if (typeof window !== "undefined") {
      (window as unknown as { testCustomerAnalytics: typeof testCustomerAnalytics }).testCustomerAnalytics = testCustomerAnalytics;
    }
  }, [isRefreshing]);
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [activityMetrics, setActivityMetrics] = useState(["DAU", "WAU", "MAU"]);
  const [chartState, setChartState] = useState<ChartState>("data");
  const toggleMetric = (metric: string) => setActivityMetrics((metrics) => metrics.includes(metric) ? metrics.filter((item) => item !== metric) : [...metrics, metric]);
  const topCustomers = useMemo(() => [...customers].sort((a, b) => b.usage.messages - a.usage.messages).slice(0, 6), []);
  const exportReport = () => { downloadCsv("superblock-analytics.csv", topCustomers.map((customer) => ({ Customer: customer.company, Messages: customer.usage.messages, Broadcasts: customer.usage.broadcasts, Conversations: customer.usage.conversations, Revenue: customer.subscription.mrr }))); toast.success("Analytics exported", { description: "The CSV report is ready in your downloads." }); };

  return (
    <AppShell breadcrumbs={["Analytics Studio"]}>
      <PageHeader eyebrow="Platform performance" title="Analytics Studio" description="Customer growth, communication volume, engagement, and revenue signals across the Superblock platform." actions={<span className="data-freshness"><span className="size-2 rounded-full bg-emerald-500" />Updated 2 min ago</span>} />
      <div className="mt-4"><AnalyticsToolbar dateRange={dateRange} setDateRange={setDateRange} onExport={exportReport} onRefresh={() => { refreshData(); toast.success("Refreshing analytics"); }} loading={isRefreshing} /></div>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi, index) => <KpiCard key={kpi.label} {...kpi} icon={metricIcons[index]} loading={isRefreshing} />)}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="panel p-4">
          <SectionHeader title="User activity" description="Daily, weekly, and monthly active users" action={<div className="flex items-center gap-1">{["DAU", "WAU", "MAU"].map((metric) => <button key={metric} onClick={() => toggleMetric(metric)} className={cn("chart-toggle", activityMetrics.includes(metric) && "active")}>{metric}</button>)}<ChartMenu state={chartState} setState={setChartState} /></div>} />
          <div className="chart-height">
            {chartState === "empty" ? <EmptyState onReset={() => setChartState("data")} /> : chartState === "error" ? <ErrorState onRetry={() => setChartState("data")} /> : <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsSeries} margin={{ top: 10, right: 5, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="dau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.24} /><stop offset="1" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="wau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-2)" stopOpacity={0.14} /><stop offset="1" stopColor="var(--chart-2)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} dy={8} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(value) => `${value / 1000}k`} />
                <RechartsTooltip content={<ChartTooltip />} />
                {activityMetrics.includes("DAU") && <Area type="monotone" dataKey="dau" name="DAU" stroke="var(--chart-1)" fill="url(#dau)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                {activityMetrics.includes("WAU") && <Area type="monotone" dataKey="wau" name="WAU" stroke="var(--chart-2)" fill="url(#wau)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                {activityMetrics.includes("MAU") && <Line type="monotone" dataKey="mau" name="MAU" stroke="var(--chart-3)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
              </AreaChart>
            </ResponsiveContainer>}
          </div>
          <div className="mt-2 grid grid-cols-3 divide-x rounded-lg bg-muted/35 px-2 py-2.5 text-center">
            <div><div className="font-tabular text-sm font-semibold">10,482</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">DAU</div></div>
            <div><div className="font-tabular text-sm font-semibold">35,640</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">WAU</div></div>
            <div><div className="font-tabular text-sm font-semibold">79,410</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">MAU</div></div>
          </div>
        </div>

        <div className="panel p-4">
          <SectionHeader title="Communication volume" description="Millions of outbound messages by channel" action={<Button variant="ghost" size="icon" className="size-7"><MoreHorizontal className="size-4" /></Button>} />
          <div className="chart-height">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsSeries} margin={{ top: 10, right: 4, left: -24, bottom: 0 }} barGap={1}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} dy={8} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                <RechartsTooltip content={<ChartTooltip suffix="k" />} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
                <Bar dataKey="whatsapp" name="WhatsApp" stackId="a" fill={channelColors.WhatsApp} radius={[0, 0, 2, 2]} />
                <Bar dataKey="email" name="Email" stackId="a" fill={channelColors.Email} />
                <Bar dataKey="sms" name="SMS" stackId="a" fill={channelColors.SMS} />
                <Bar dataKey="broadcasts" name="Broadcasts" stackId="a" fill={channelColors.Broadcasts} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"><div><div className="text-[11px] text-muted-foreground">Fastest-growing channel</div><div className="mt-0.5 text-xs font-semibold">WhatsApp · +24.6%</div></div><span className="font-tabular text-sm font-semibold">16.2M</span></div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="panel p-4 lg:col-span-1">
          <SectionHeader title="Conversations" description="59,000 conversations this period" />
          <div className="relative mx-auto h-[205px] max-w-[300px]">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={conversationSeries} dataKey="value" nameKey="name" innerRadius={62} outerRadius={84} paddingAngle={2} stroke="none">{conversationSeries.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><RechartsTooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><div className="font-tabular text-xl font-semibold tracking-[-0.04em]">59.0K</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div></div></div>
          </div>
          <div className="grid grid-cols-2 gap-2">{conversationSeries.map((item) => <div key={item.name} className="flex items-center justify-between rounded-md bg-muted/35 px-2.5 py-2 text-[11px]"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="size-2 rounded-full" style={{ background: item.color }} />{item.name}</span><span className="font-tabular font-semibold">{formatNumber(item.value)}</span></div>)}</div>
        </div>
        <div className="panel p-4 lg:col-span-2">
          <SectionHeader title="Customer growth" description="Activation, churn, and net expansion performance" action={<StatusBadge status="Healthy" />} />
          <div className="h-[270px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analyticsSeries.map((row, index) => ({ ...row, new: 62 + index * 5 + (index % 2) * 12, activated: 48 + index * 4, churned: 12 + (index % 3) * 5, renewed: 31 + index * 3 }))} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} dy={8} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} /><RechartsTooltip content={<ChartTooltip />} /><Area dataKey="new" name="New" type="monotone" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.08} strokeWidth={2} dot={false} /><Line dataKey="activated" name="Activated" type="monotone" stroke="var(--positive)" strokeWidth={2} dot={false} /><Line dataKey="churned" name="Churned" type="monotone" stroke="var(--negative)" strokeWidth={1.6} strokeDasharray="4 4" dot={false} /><Line dataKey="renewed" name="Renewed" type="monotone" stroke="var(--chart-4)" strokeWidth={1.6} dot={false} /><Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "10px" }} /></AreaChart></ResponsiveContainer></div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 2xl:grid-cols-[1.35fr_1fr]">
        <div className="panel overflow-hidden">
          <div className="p-4 pb-2"><SectionHeader title="Top customers by usage" description="Ranked by total cross-channel volume" action={<Link href="/customers" className="inline-flex items-center text-[12px] font-medium text-muted-foreground hover:text-foreground">View all <ChevronRight className="size-3" /></Link>} /></div>
          <div className="overflow-x-auto"><table className="data-table min-w-[760px]"><thead><tr><th>Customer</th><th className="text-right">Messages</th><th className="text-right">Broadcasts</th><th className="text-right">Conversations</th><th className="text-right">Total usage</th><th className="text-right">MRR</th></tr></thead><tbody>{topCustomers.map((customer) => <tr key={customer.id}><td><Link href={`/customers/${customer.id}`} className="font-medium hover:underline">{customer.company}</Link><div className="font-mono text-[10px] text-muted-foreground">{customer.id}</div></td><td className="text-right font-tabular">{formatNumber(customer.usage.messages)}</td><td className="text-right font-tabular">{customer.usage.broadcasts}</td><td className="text-right font-tabular">{formatNumber(customer.usage.conversations)}</td><td className="text-right font-tabular">{formatNumber(customer.usage.messages + customer.usage.email + customer.usage.sms)}</td><td className="text-right font-tabular font-medium">{formatCurrency(customer.subscription.mrr)}</td></tr>)}</tbody></table></div>
        </div>
        <div className="panel overflow-hidden">
          <div className="p-4 pb-2"><SectionHeader title="Recent activity" description="Live workspace events" action={<span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600"><span className="size-2 rounded-full bg-emerald-500" /> LIVE</span>} /></div>
          <div className="divide-y divide-border/60">{recentActivity.map((item) => <div key={`${item.time}-${item.customer}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"><div className="w-10 font-mono text-[10px] text-muted-foreground">{item.time}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{item.activity}</div><div className="truncate text-[11px] text-muted-foreground">{item.customer} · {item.channel} · {item.volume}</div></div><StatusBadge status={item.status} dot={false} /></div>)}</div>
        </div>
      </section>
    </AppShell>
  );
}

function ChartMenu({ state, setState }: { state: ChartState; setState: (state: ChartState) => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setState("data")}>Show data</DropdownMenuItem><DropdownMenuItem onClick={() => setState("empty")}>Preview empty state</DropdownMenuItem><DropdownMenuItem onClick={() => setState("error")}>Preview error state</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}

function ChartTooltip({ active, payload, label, suffix = "" }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; suffix?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-lg border bg-popover p-2.5 text-popover-foreground shadow-lg"><div className="mb-1.5 text-[11px] font-medium text-muted-foreground">{label}</div>{payload.map((item) => <div key={item.name} className="flex min-w-[120px] items-center justify-between gap-4 py-0.5 text-[11px]"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-tabular font-semibold">{item.value.toLocaleString("en-IN")}{suffix}</span></div>)}</div>;
}
