export type CustomerStatus = "Active" | "Trial" | "Paid" | "Renewal Due" | "Expired" | "Suspended" | "Cancelled";
export type HealthStatus = "Healthy" | "At Risk" | "Expansion" | "Renewal Risk";

export type Offering = {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Trial" | "Paused";
  startDate: string;
  expiryDate: string;
  quantity: string;
  pricing: string;
  notes: string;
  owner: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdDate: string;
  updatedAt: string;
  category: "General" | "Sales" | "Support" | "Billing" | "Technical" | "Renewal" | "Important";
  priority: "Low" | "Medium" | "High";
};

export type Meeting = {
  id: string;
  date: string;
  title: string;
  participants: string[];
  owner: string;
  summary: string;
  decisions: string;
  actionItems: string[];
  dueDate: string;
  followUp: string;
  status: "Completed" | "Scheduled" | "Follow-up due";
};

export type Credential = {
  id: string;
  type: "Superblock" | "Meta" | "CRM" | "ERP" | "Email" | "Other";
  username: string;
  loginUrl: string;
  password: string;
  updatedAt: string;
  notes: string;
};

export type Invoice = {
  id: string;
  date: string;
  dueDate: string;
  product: string;
  amount: number;
  tax: number;
  total: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";
  paymentDate?: string;
};

export type Activity = {
  id: string;
  time: string;
  type: string;
  title: string;
  detail: string;
  actor: string;
  channel?: string;
};

export type Customer = {
  id: string;
  company: string;
  industry: string;
  region: string;
  initials: string;
  contact: { name: string; email: string; phone: string };
  activatedAt: string;
  status: CustomerStatus;
  plan: string;
  subscription: { status: string; startDate: string; renewalDate: string; billingCycle: string; mrr: number; contractValue: number; paymentStatus: string };
  renewal: string;
  usage: { messages: number; broadcasts: number; conversations: number; email: number; sms: number; whatsapp: number; api: number; automations: number; storage: number; contacts?: number };
  offerings: Offering[];
  notes: Note[];
  meetings: Meeting[];
  credentials: Credential[];
  invoices: Invoice[];
  activities: Activity[];
  health: { score: number; status: HealthStatus; usageTrend: "Increasing" | "Stable" | "Declining"; loginFrequency: string; riskReason: string };
  owner: { name: string; initials: string };
  lastActivity: string;
};

const sharedOfferings: Offering[] = [
  { id: "off-1", name: "WhatsApp Business API", description: "Managed WABA onboarding, messaging, and template operations.", status: "Active", startDate: "12 Mar 2025", expiryDate: "11 Mar 2026", quantity: "2 numbers", pricing: "₹32,000 / mo", notes: "Includes priority template review.", owner: "Anika Shah" },
  { id: "off-2", name: "AI Agent", description: "Automated lead qualification and first-response agent.", status: "Trial", startDate: "01 Sep 2026", expiryDate: "30 Sep 2026", quantity: "1 agent", pricing: "Pilot", notes: "Success criteria: 65% deflection.", owner: "Karan Mehta" },
  { id: "off-3", name: "WhatsApp Broadcast", description: "Segmented campaigns, scheduling, and performance analytics.", status: "Active", startDate: "12 Mar 2025", expiryDate: "11 Mar 2026", quantity: "500k / mo", pricing: "Usage based", notes: "Festival burst capacity enabled.", owner: "Anika Shah" },
];

const sharedNotes: Note[] = [
  { id: "note-1", title: "Renewal preparation", content: "Customer is open to an annual renewal if automation volume is bundled. Share the revised commercial before the next meeting.", createdBy: "Anika Shah", createdDate: "12 Sep 2026", updatedAt: "12 Sep 2026", category: "Renewal", priority: "High" },
  { id: "note-2", title: "Campaign throughput", content: "Support confirmed the September peak-traffic configuration. No delivery degradation observed during the first run.", createdBy: "Rishi Kapoor", createdDate: "08 Sep 2026", updatedAt: "09 Sep 2026", category: "Technical", priority: "Medium" },
];

const sharedMeetings: Meeting[] = [
  { id: "meet-1", date: "10 Sep 2026", title: "Q3 business review", participants: ["Anika Shah", "Maya Iyer", "Arjun Nair"], owner: "Anika Shah", summary: "Reviewed broadcast growth, response time, and upcoming seasonal campaign capacity.", decisions: "Proceed with AI Agent pilot and annual-plan proposal.", actionItems: ["Share AI pilot scorecard", "Send revised annual commercial", "Schedule Meta quality review"], dueDate: "18 Sep 2026", followUp: "22 Sep 2026", status: "Follow-up due" },
  { id: "meet-2", date: "28 Aug 2026", title: "Automation discovery", participants: ["Karan Mehta", "Maya Iyer"], owner: "Karan Mehta", summary: "Mapped lead qualification and abandoned-cart recovery flows.", decisions: "Start with lead qualification on one number.", actionItems: ["Publish sandbox workflow", "Approve prompt policy"], dueDate: "03 Sep 2026", followUp: "10 Sep 2026", status: "Completed" },
];

const sharedCredentials: Credential[] = [
  { id: "cred-1", type: "Superblock", username: "admin@acmecommerce.in", loginUrl: "https://app.superblock.chat", password: "SblocK!2026#ops", updatedAt: "04 Sep 2026", notes: "Operations administrator; shared access prohibited." },
  { id: "cred-2", type: "Meta", username: "business@acmecommerce.in", loginUrl: "https://business.facebook.com", password: "Meta#Waba9221", updatedAt: "19 Aug 2026", notes: "2FA controlled by customer finance owner." },
];

const sharedInvoices: Invoice[] = [
  { id: "INV-20341", date: "01 Sep 2026", dueDate: "10 Sep 2026", product: "Growth + WhatsApp API", amount: 128000, tax: 23040, total: 151040, status: "Paid", paymentDate: "06 Sep 2026" },
  { id: "INV-20116", date: "01 Aug 2026", dueDate: "10 Aug 2026", product: "Growth + WhatsApp API", amount: 128000, tax: 23040, total: 151040, status: "Paid", paymentDate: "08 Aug 2026" },
  { id: "INV-19982", date: "01 Jul 2026", dueDate: "10 Jul 2026", product: "Growth + WhatsApp API", amount: 124000, tax: 22320, total: 146320, status: "Paid", paymentDate: "09 Jul 2026" },
];

const sharedActivities: Activity[] = [
  { id: "act-1", time: "15 Sep · 10:42", type: "Broadcast", title: "Festival Preview sent", detail: "182,400 recipients · 97.8% delivered", actor: "Maya Iyer", channel: "WhatsApp" },
  { id: "act-2", time: "14 Sep · 16:20", type: "Login", title: "Workspace admin signed in", detail: "Mumbai, IN · Chrome on macOS", actor: "Arjun Nair" },
  { id: "act-3", time: "12 Sep · 12:05", type: "Note", title: "Renewal note added", detail: "Annual renewal conditions documented", actor: "Anika Shah" },
  { id: "act-4", time: "10 Sep · 15:30", type: "Meeting", title: "Q3 business review completed", detail: "3 action items created", actor: "Anika Shah" },
  { id: "act-5", time: "06 Sep · 09:18", type: "Invoice", title: "INV-20341 paid", detail: "₹151,040 received", actor: "Finance automation" },
];

const customerSeeds = [
  ["CUS-10482", "Acme Commerce", "E-commerce", "India", "AC", "Maya Iyer", "Active", "Growth", 128000, 94, "Healthy", "Increasing", "Anika Shah", "AS", 984220, 42],
  ["CUS-10461", "Northstar Learning", "Education", "India", "NL", "Vikram Sethi", "Renewal Due", "Advanced", 186000, 71, "Renewal Risk", "Stable", "Anika Shah", "AS", 812450, 19],
  ["CUS-10444", "Carely Health", "Healthcare", "India", "CH", "Dr. Neha Rao", "Paid", "Growth", 92000, 88, "Healthy", "Increasing", "Rishi Kapoor", "RK", 642110, 28],
  ["CUS-10439", "UrbanNest Realty", "Real Estate", "UAE", "UR", "Rehan Malik", "Trial", "Starter", 0, 63, "Expansion", "Increasing", "Karan Mehta", "KM", 168400, 8],
  ["CUS-10417", "Wanderwise", "Travel", "Singapore", "WW", "Lena Tan", "At Risk", "Growth", 76000, 42, "At Risk", "Declining", "Rishi Kapoor", "RK", 318250, 15],
  ["CUS-10398", "Fleetgrid Logistics", "Logistics", "India", "FL", "Sameer Khan", "Active", "Advanced", 214000, 91, "Healthy", "Stable", "Anika Shah", "AS", 1104820, 35],
  ["CUS-10376", "Mirovia Finance", "Financial Services", "India", "MF", "Radhika Bose", "Suspended", "Custom", 248000, 35, "At Risk", "Declining", "Karan Mehta", "KM", 248900, 21],
  ["CUS-10355", "Saffron & Co.", "Retail", "India", "SC", "Aarav Desai", "Paid", "Starter", 48000, 79, "Healthy", "Stable", "Rishi Kapoor", "RK", 412600, 12],
  ["CUS-10321", "Elevate Fitness", "Wellness", "India", "EF", "Tara Menon", "Trial", "Growth", 0, 68, "Expansion", "Increasing", "Karan Mehta", "KM", 88400, 6],
  ["CUS-10288", "BrightPath Careers", "Education", "India", "BP", "Nitin Batra", "Expired", "Starter", 36000, 38, "Renewal Risk", "Declining", "Anika Shah", "AS", 56120, 3],
] as const;

export const customers: Customer[] = customerSeeds.map((seed, index) => {
  const [id, company, industry, region, initials, contactName, status, plan, mrr, score, healthStatus, usageTrend, ownerName, ownerInitials, messages, broadcasts] = seed;
  const renewalDates = ["12 Mar 2027", "24 Sep 2026", "18 Jan 2027", "30 Sep 2026", "04 Oct 2026", "21 May 2027", "02 Oct 2026", "15 Feb 2027", "30 Sep 2026", "31 Aug 2026"];
  const lastActivity = ["4 min ago", "18 min ago", "42 min ago", "1 hr ago", "3 hr ago", "Yesterday", "Yesterday", "2 days ago", "3 days ago", "12 days ago"][index];
  const emailSlug = company.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return {
    id,
    company,
    industry,
    region,
    initials,
    contact: { name: contactName, email: `${contactName.split(" ")[0].toLowerCase()}@${emailSlug}.com`, phone: `+91 98${String(41000000 + index * 73541).slice(0, 8)}` },
    activatedAt: `${12 + index} ${index % 2 ? "Apr" : "Mar"} 2025`,
    status: status as CustomerStatus,
    plan,
    subscription: { status: status === "Trial" ? "Trial" : status === "Suspended" ? "Past due" : "Active", startDate: "12 Mar 2025", renewalDate: renewalDates[index], billingCycle: "Monthly", mrr, contractValue: mrr * 12, paymentStatus: status === "Suspended" ? "Overdue" : "Current" },
    renewal: renewalDates[index],
    usage: { messages, broadcasts, conversations: Math.round(messages / 340), email: Math.round(messages * 0.18), sms: Math.round(messages * 0.09), whatsapp: Math.round(messages * 0.73), api: Math.round(messages * 1.9), automations: 1640 + index * 184, storage: 18 + index * 4 },
    offerings: sharedOfferings.map((item, itemIndex) => ({ ...item, id: `${id}-${itemIndex}` })),
    notes: sharedNotes.map((item, itemIndex) => ({ ...item, id: `${id}-note-${itemIndex}` })),
    meetings: sharedMeetings.map((item, itemIndex) => ({ ...item, id: `${id}-meet-${itemIndex}` })),
    credentials: sharedCredentials.map((item, itemIndex) => ({ ...item, id: `${id}-cred-${itemIndex}` })),
    invoices: sharedInvoices.map((item, itemIndex) => ({ ...item, id: `INV-${20341 - index * 11 - itemIndex}` })),
    activities: sharedActivities.map((item, itemIndex) => ({ ...item, id: `${id}-act-${itemIndex}` })),
    health: { score, status: healthStatus as HealthStatus, usageTrend, loginFrequency: index < 5 ? "Daily" : "Weekly", riskReason: score < 60 ? "Declining usage and payment attention required" : score < 75 ? "Renewal or expansion review needed" : "No immediate risks detected" },
    owner: { name: ownerName, initials: ownerInitials },
    lastActivity,
  };
});

export const analyticsSeries = [
  { date: "Aug 17", dau: 8120, wau: 28600, mau: 68400, whatsapp: 148, sms: 42, email: 72, broadcasts: 28 },
  { date: "Aug 21", dau: 8460, wau: 29400, mau: 70200, whatsapp: 161, sms: 46, email: 78, broadcasts: 32 },
  { date: "Aug 25", dau: 8240, wau: 30100, mau: 71100, whatsapp: 156, sms: 44, email: 81, broadcasts: 29 },
  { date: "Aug 29", dau: 9080, wau: 31500, mau: 72800, whatsapp: 182, sms: 52, email: 88, broadcasts: 38 },
  { date: "Sep 02", dau: 9440, wau: 32800, mau: 74600, whatsapp: 194, sms: 56, email: 93, broadcasts: 41 },
  { date: "Sep 06", dau: 9320, wau: 33400, mau: 75900, whatsapp: 188, sms: 54, email: 96, broadcasts: 39 },
  { date: "Sep 10", dau: 10120, wau: 34800, mau: 78100, whatsapp: 218, sms: 61, email: 104, broadcasts: 46 },
  { date: "Sep 14", dau: 10482, wau: 35640, mau: 79410, whatsapp: 226, sms: 64, email: 109, broadcasts: 49 },
];

export const kpis = [
  { label: "Monthly active users", value: "79,410", change: 12.8, comparison: "vs previous 30 days", spark: [22, 28, 26, 34, 38, 36, 45] },
  { label: "Active customers", value: "1,284", change: 8.4, comparison: "106 net new", spark: [20, 23, 29, 31, 30, 37, 42] },
  { label: "Messages sent", value: "24.8M", change: 18.6, comparison: "vs previous 30 days", spark: [18, 25, 22, 32, 35, 43, 47] },
  { label: "Monthly recurring revenue", value: "₹2.48Cr", change: 6.2, comparison: "92.4% collected", spark: [24, 25, 28, 29, 34, 34, 38] },
  { label: "Trial conversion", value: "34.7%", change: 3.1, comparison: "142 converted", spark: [28, 27, 30, 32, 34, 36, 39] },
  { label: "Renewals due", value: "48", change: -9.3, comparison: "₹36.2L at risk", spark: [42, 39, 41, 34, 36, 31, 28] },
];

export const conversationSeries = [
  { name: "New", value: 18420, color: "var(--chart-1)" },
  { name: "Active", value: 8240, color: "var(--chart-2)" },
  { name: "Resolved", value: 28960, color: "var(--chart-3)" },
  { name: "Escalated", value: 1380, color: "var(--chart-5)" },
];

export const recentActivity = [
  { time: "10:42", customer: "Acme Commerce", activity: "Broadcast sent", channel: "WhatsApp", volume: "182.4k", status: "Delivered" },
  { time: "10:31", customer: "Carely Health", activity: "Workflow completed", channel: "Automation", volume: "8.2k", status: "Success" },
  { time: "10:18", customer: "Northstar Learning", activity: "Invoice reminder", channel: "Email", volume: "1", status: "Opened" },
  { time: "09:56", customer: "Fleetgrid Logistics", activity: "API batch", channel: "API", volume: "62.8k", status: "Success" },
  { time: "09:40", customer: "UrbanNest Realty", activity: "Trial workspace login", channel: "Platform", volume: "1", status: "Active" },
];

export const products = [
  { name: "WhatsApp Business API", category: "Channel", model: "Usage based", status: "Active", plans: 3, customers: 942 },
  { name: "Superblock Team Inbox", category: "Collaboration", model: "Per seat", status: "Active", plans: 4, customers: 788 },
  { name: "Broadcast Studio", category: "Marketing", model: "Tiered usage", status: "Active", plans: 3, customers: 654 },
  { name: "AI Agent", category: "AI & Automation", model: "Outcome + usage", status: "Beta", plans: 2, customers: 86 },
];

export const plans = [
  { name: "Starter", product: "Omnichannel Suite", monthly: 1499, annual: 15290, limit: "10k broadcasts", features: 6, status: "Active" },
  { name: "Growth", product: "Omnichannel Suite", monthly: 2699, annual: 27530, limit: "Unlimited broadcasts", features: 12, status: "Active" },
  { name: "Advanced", product: "Omnichannel Suite", monthly: 5999, annual: 61190, limit: "5k automations", features: 18, status: "Active" },
  { name: "Enterprise", product: "Custom bundle", monthly: 0, annual: 0, limit: "Contracted", features: 24, status: "Private" },
];

export const teamMembers = [
  { name: "Anika Shah", initials: "AS", email: "anika@superblock.chat", role: "Customer Success", department: "Customer", customers: 42, status: "Active", lastActive: "Now" },
  { name: "Karan Mehta", initials: "KM", email: "karan@superblock.chat", role: "Sales", department: "Revenue", customers: 31, status: "Active", lastActive: "8 min ago" },
  { name: "Rishi Kapoor", initials: "RK", email: "rishi@superblock.chat", role: "Support", department: "Customer", customers: 28, status: "Active", lastActive: "24 min ago" },
  { name: "Nisha Rao", initials: "NR", email: "nisha@superblock.chat", role: "Finance", department: "Finance", customers: 0, status: "Active", lastActive: "1 hr ago" },
  { name: "Dev Malhotra", initials: "DM", email: "dev@superblock.chat", role: "Analyst", department: "Operations", customers: 0, status: "Away", lastActive: "Yesterday" },
];

export const allInvoices = customers.flatMap((customer) => customer.invoices.map((invoice) => ({ ...invoice, customer: customer.company, customerId: customer.id })));

export const subscriptions = customers.map((customer) => ({
  customer: customer.company,
  customerId: customer.id,
  plan: customer.plan,
  status: customer.subscription.status,
  startDate: customer.subscription.startDate,
  renewalDate: customer.subscription.renewalDate,
  cycle: customer.subscription.billingCycle,
  mrr: customer.subscription.mrr,
  amount: customer.subscription.contractValue,
  payment: customer.subscription.paymentStatus,
  autoRenewal: customer.status !== "Renewal Due" && customer.status !== "Expired",
}));

export const globalSearchItems = [
  ...customers.map((customer) => ({ type: "Customer", title: customer.company, detail: `${customer.id} · ${customer.plan}`, href: `/customers/${customer.id}` })),
  ...allInvoices.slice(0, 10).map((invoice) => ({ type: "Invoice", title: invoice.id, detail: `${invoice.customer} · ₹${invoice.total.toLocaleString("en-IN")}`, href: "/invoices" })),
  ...products.map((product) => ({ type: "Product", title: product.name, detail: `${product.category} · ${product.status}`, href: "/products" })),
  ...customers.slice(0, 3).flatMap((customer) => customer.notes.map((note) => ({ type: "Note", title: note.title, detail: `${customer.company} · ${note.category}`, href: `/customers/${customer.id}` }))),
];

export function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString("en-IN");
}
