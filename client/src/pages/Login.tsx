import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { BrandMark } from "@/components/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const previewBars = [44, 58, 51, 68, 63, 78, 88, 84, 96];
const trustItems = ["Customer health", "Usage analytics", "Revenue operations"];

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("anika@superblock.chat");
  const [password, setPassword] = useState("superblock-demo");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signIn = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      toast.success("Welcome back, Anika");
      navigate("/analytics");
    }, 900);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email.includes("@")) {
      setError("Enter a valid work email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }
    signIn();
  };

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Superblock Analytics Studio overview">
        <div className="login-story-grid" />
        <div className="login-story-orb login-story-orb-one" />
        <div className="login-story-orb login-story-orb-two" />

        <div className="relative z-10 flex h-full flex-col">
          <BrandMark />

          <div className="mt-auto max-w-[660px] pb-10 pt-20">
            <div className="login-eyebrow">
              <span className="signal-dot signal-dot-lime" />
              Customer intelligence workspace
            </div>
            <h1 className="mt-6 max-w-[640px] text-[52px] font-semibold leading-[1.02] tracking-[-0.055em] xl:text-[60px]">
              Every customer signal,
              <span className="mt-1 block text-[#b7f34a]">ready for action.</span>
            </h1>
            <p className="mt-6 max-w-[540px] text-[15px] leading-7 text-white/60">
              Connect customer health, communication usage, subscriptions, billing, and account context in one operational view.
            </p>

            <div className="login-product-preview">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <div className="text-[12px] font-semibold text-white">Workspace pulse</div>
                  <div className="mt-0.5 text-[10px] text-white/40">Last 30 days</div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/50">
                  <span className="signal-dot signal-dot-green" /> Live
                </div>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1.35fr]">
                <div className="grid grid-cols-2 gap-2">
                  <PreviewMetric icon={UsersRound} label="Active customers" value="1,284" trend="+8.4%" />
                  <PreviewMetric icon={MessageCircleMore} label="Messages sent" value="24.8M" trend="+18.6%" />
                  <PreviewMetric icon={BarChart3} label="Trial conversion" value="34.7%" trend="+3.1%" />
                  <PreviewMetric icon={Sparkles} label="Health score" value="88.2" trend="+4.8%" />
                </div>
                <div className="login-chart" aria-label="Platform usage growth preview">
                  <div className="flex h-full items-end gap-2">
                    {previewBars.map((height, index) => (
                      <span key={height + index} className="login-chart-bar" style={{ height: `${height}%`, opacity: 0.48 + index * 0.055 }} />
                    ))}
                  </div>
                  <div className="absolute left-3 top-3 text-[10px] text-white/45">Platform usage</div>
                  <div className="absolute right-3 top-3 text-[11px] font-semibold text-[#b7f34a]">+18.6%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-5 text-[10px] text-white/40">
            <span>Internal operations workspace</span>
            <span className="flex items-center gap-2"><ShieldCheck className="size-3.5" /> Secure by design</span>
          </div>
        </div>
      </section>

      <section className="login-form-side">
        <div className="login-mobile-brand"><BrandMark /></div>
        <div className="login-form-wrap">
          <div className="mb-9">
            <div className="section-kicker">Superblock HQ</div>
            <h2 className="text-[34px] font-semibold tracking-[-0.045em]">Sign in to your workspace</h2>
            <p className="mt-2 text-[14px] leading-6 text-muted-foreground">Access analytics, customer operations, and billing insights.</p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-center gap-3 bg-card text-[13px]"
            onClick={() => {
              toast.success("Workspace SSO simulated");
              signIn();
            }}
            disabled={loading}
          >
            <ShieldCheck className="size-4 text-emerald-600" />
            Continue with workspace SSO
          </Button>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or use work email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="email" className="text-[12px] font-medium">Work email</Label>
              <Input
                id="email"
                className="mt-2 h-11 bg-card px-3.5 text-[14px]"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                aria-invalid={!!error}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[12px] font-medium">Password</Label>
                <button
                  type="button"
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toast.info("Password reset link sent", { description: "Mock interaction only." })}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-2">
                <Input
                  id="password"
                  className="h-11 bg-card px-3.5 pr-11 text-[14px]"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  aria-invalid={!!error}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-0 top-0 grid size-11 place-items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2.5 py-0.5">
              <Checkbox id="remember" defaultChecked />
              <Label htmlFor="remember" className="text-[12px] font-normal text-muted-foreground">Keep me signed in on this device</Label>
            </div>

            <Button className="h-11 w-full text-[13px]" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
              {loading ? "Signing in…" : "Sign in securely"}
              {!loading && <ArrowRight className="ml-auto size-4" />}
            </Button>
          </form>

          <div className="mt-7 rounded-xl border bg-muted/30 p-3.5">
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-background text-emerald-600"><KeyRound className="size-3.5" /></span>
              <div>
                <div className="text-[12px] font-medium">Demo workspace access</div>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Any valid email and a password with six or more characters will open the dashboard.</p>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
            {trustItems.map((item) => <span key={item} className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" />{item}</span>)}
          </div>
        </div>
        <div className="login-footer">
          <span>© 2026 Superblock</span>
          <div className="flex items-center gap-4"><button onClick={() => toast.info("Privacy policy")}>Privacy</button><button onClick={() => toast.info("Support center")}>Support</button></div>
        </div>
      </section>
    </main>
  );
}

function PreviewMetric({ icon: Icon, label, value, trend }: { icon: typeof UsersRound; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between"><Icon className="size-3.5 text-white/45" /><span className="text-[9px] font-medium text-[#b7f34a]">{trend}</span></div>
      <div className="mt-4 text-[18px] font-semibold tracking-[-0.03em] text-white">{value}</div>
      <div className="mt-1 text-[9px] text-white/45">{label}</div>
    </div>
  );
}
