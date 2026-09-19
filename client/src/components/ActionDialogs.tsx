import { useState, type ReactNode } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export interface QuickFormDefaultValues {
  name?: string;
  email?: string;
  plan?: string;
  description?: string;
}

export function QuickFormDialog({
  trigger,
  title,
  description,
  type = "general",
  defaultValues,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  type?: "general" | "note" | "meeting" | "customer" | "product";
  defaultValues?: QuickFormDefaultValues;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = () => {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setOpen(false);
      const isEdit = title.toLowerCase().includes("edit");
      const entity = title.replace(/^(Add|Create|Edit)\s+/i, "");
      toast.success(isEdit ? `${entity} updated` : `${entity} saved`, {
        description: "Your workspace has been updated.",
      });
    }, 700);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="grid gap-1.5"><Label htmlFor={`${title}-name`} className="text-xs">{type === "meeting" ? "Meeting title" : type === "note" ? "Note title" : type === "customer" ? "Company name" : "Name"}</Label><Input id={`${title}-name`} defaultValue={defaultValues?.name} placeholder={type === "meeting" ? "Q4 strategy review" : type === "note" ? "Add a clear title" : "Enter a name"} /></div>
          {type === "customer" && <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label className="text-xs">Contact email</Label><Input type="email" defaultValue={defaultValues?.email} placeholder="owner@company.com" /></div><div className="grid gap-1.5"><Label className="text-xs">Plan</Label><Select defaultValue={defaultValues?.plan || "growth"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="starter">Starter</SelectItem><SelectItem value="growth">Growth</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent></Select></div></div>}
          {type === "meeting" && <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label className="text-xs">Date</Label><Input type="date" /></div><div className="grid gap-1.5"><Label className="text-xs">Owner</Label><Select defaultValue="anika"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="anika">Anika Shah</SelectItem><SelectItem value="karan">Karan Mehta</SelectItem><SelectItem value="rishi">Rishi Kapoor</SelectItem></SelectContent></Select></div></div>}
          <div className="grid gap-1.5"><Label className="text-xs">{type === "note" ? "Note" : type === "meeting" ? "Discussion summary" : "Description"}</Label><Textarea rows={4} defaultValue={defaultValues?.description} placeholder="Add context for your team…" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); toast.success("Copied to clipboard"); window.setTimeout(() => setCopied(false), 1200); }}>{copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}{copied ? "Copied" : label}</Button>;
}
