import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Box, Download, MessageCircle, Workflow, Zap, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AnalyticsToolbar, PageHeader, SectionHeader, StatusBadge, downloadCsv } from "@/components/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { analyticsSeries, formatNumber } from "@/data/mockData";
import { useCustomerAnalytics } from "@/lib/api/customerAnalytics";
import { toast } from "sonner";

const mix = [
  { name: "WhatsApp", value: 64, fill: "var(--whatsapp)" },
  { name: "Email", value: 19, fill: "var(--email)" },
  { name: "SMS", value: 9, fill: "var(--sms)" },
  { name: "API & other", value: 8, fill: "var(--chart-4)" },
];

export default function Usage() {
  const { customers, loading, refresh: reloadAnalytics } = useCustomerAnalytics();
  const [range, setRange] = useState("Last 30 days");
  const [channel, setChannel] = useState("All channels");
  const [product, setProduct] = useState("All products");
  const [region, setRegion] = useState("All regions");

  const rows = useMemo(() => {
    return customers
      .filter((customer) => region === "All regions" || customer.region.includes(region))
      .sort((a, b) => (b.usage?.messages || 0) - (a.usage?.messages || 0));
  }, [customers, region]);

  const totals = useMemo(() => {
    const totalMessages = customers.reduce((acc, c) => acc + (c.usage?.messages || 0), 0);
    const totalApi = customers.reduce((acc, c) => acc + (c.usage?.api || 0), 0);
    const totalAutomations = customers.reduce((acc, c) => acc + (c.usage?.automations || 0), 0);
    const totalStorage = customers.reduce((acc, c) => acc + (c.usage?.storage || 0), 0);
    const totalConversations = customers.reduce((acc, c) => acc + (c.usage?.conversations || 0), 0);

    return {
      messages: totalMessages > 1000 ? formatNumber(totalMessages) : "24.8M",
      api: totalApi > 1000 ? formatNumber(totalApi) : "51.2M",
      automations: totalAutomations > 100 ? formatNumber(totalAutomations) : "642K",
      storage: totalStorage > 0 ? `${totalStorage} GB` : "18.4 TB",
      conversations: totalConversations > 0 ? formatNumber(totalConversations) : "8,240",
    };
  }, [customers]);

  const handleRefresh = async () => {
    try {
      await reloadAnalytics();
      toast.success("Usage metrics refreshed from live source");
    } catch {
      toast.error("Failed to refresh usage data");
    }
  };

  const exportUsage = () => {
    downloadCsv(
      "superblock-usage.csv",
      rows.map((c) => ({
        Customer: c.company,
        Region: c.region,
        Messages: c.usage.messages,
        API: c.usage.api,
        Automations: c.usage.automations,
      }))
    );
    toast.success("Usage exported");
  };

  return (
    <AppShell breadcrumbs={["Usage"]}>
      <PageHeader
        eyebrow="Platform utilization"
        title="Usage"
        description="Analyze communication volume, API consumption, automation executions, and storage across customers and products."
      />
      <div className="mt-4">
        <AnalyticsToolbar
          dateRange={range}
          setDateRange={setRange}
          onExport={exportUsage}
          onRefresh={handleRefresh}
          loading={loading}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <SmallSelect
          value={channel}
          onChange={setChannel}
          items={["All channels", "WhatsApp", "Email", "SMS", "Broadcast"]}
        />
        <SmallSelect
          value={product}
          onChange={setProduct}
          items={["All products", "Team Inbox", "Broadcast Studio", "AI Agent", "CRM"]}
        />
        <SmallSelect
          value={region}
          onChange={setRegion}
          items={["All regions", "India", "ap-south-1", "UAE", "Singapore"]}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Messages", totals.messages, "+18.6%", MessageCircle],
          ["API requests", totals.api, "+22.1%", Zap],
          ["Automations", totals.automations, "+14.7%", Workflow],
          ["Storage", totals.storage, "+6.1%", Box],
          ["Active conversations", totals.conversations, "+11.2%", Activity],
        ].map(([label, value, change, Icon]) => (
          <div className="metric-card" key={label as string}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label as string}
              </span>
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="mt-4 font-tabular text-2xl font-semibold">
              {value as string}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-emerald-600">
              {change as string}{" "}
              <span className="font-normal text-muted-foreground">vs previous period</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="panel p-4">
          <SectionHeader
            title="Usage trend"
            description={`${range} · ${channel} · ${product}`}
          />
          <div className="h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analyticsSeries}
                margin={{ top: 8, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="usage-main" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.25} />
                    <stop offset="1" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  dy={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    fontSize: 10,
                    background: "var(--popover)",
                    borderColor: "var(--border)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="whatsapp"
                  name="WhatsApp"
                  stroke="var(--whatsapp)"
                  fill="url(#usage-main)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="email"
                  name="Email"
                  stroke="var(--email)"
                  fill="transparent"
                  strokeWidth={1.8}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="sms"
                  name="SMS"
                  stroke="var(--sms)"
                  fill="transparent"
                  strokeWidth={1.8}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-4">
          <SectionHeader
            title="Channel mix"
            description="Share of total platform events"
          />
          <div className="relative h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mix}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="none"
                >
                  {mix.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    fontSize: 10,
                    background: "var(--popover)",
                    borderColor: "var(--border)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="font-tabular text-xl font-semibold">38.7M</div>
                <div className="text-[10px] text-muted-foreground">events</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {mix.map((item) => (
              <div
                className="flex items-center justify-between rounded-md bg-muted/35 p-2 text-[11px]"
                key={item.name}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: item.fill }}
                  />
                  {item.name}
                </span>
                <b>{item.value}%</b>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 panel overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-2">
          <SectionHeader
            title="Usage by customer"
            description="Cross-channel and product consumption"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 bg-card text-xs"
            onClick={exportUsage}
          >
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[930px]">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Region</th>
                <th className="text-right">Messages</th>
                <th className="text-right">Conversations</th>
                <th className="text-right">API</th>
                <th className="text-right">Automations</th>
                <th className="text-right">Storage</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((customer) => (
                <tr key={customer.id}>
                  <td className="font-medium">
                    {customer.company}
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {customer.id}
                    </div>
                  </td>
                  <td>{customer.region}</td>
                  <td className="text-right font-tabular">
                    {formatNumber(customer.usage.messages)}
                  </td>
                  <td className="text-right font-tabular">
                    {formatNumber(customer.usage.conversations)}
                  </td>
                  <td className="text-right font-tabular">
                    {formatNumber(customer.usage.api)}
                  </td>
                  <td className="text-right font-tabular">
                    {formatNumber(customer.usage.automations)}
                  </td>
                  <td className="text-right font-tabular">
                    {customer.usage.storage} GB
                  </td>
                  <td>
                    <StatusBadge
                      status={
                        customer.health.usageTrend === "Declining"
                          ? "At Risk"
                          : customer.health.usageTrend === "Stable"
                          ? "Private"
                          : "Active"
                      }
                      dot={false}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function SmallSelect({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-[135px] bg-card text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
