import { useState, useEffect, type ReactNode } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fetchAuthSession } from "aws-amplify/auth";

export interface QuickFormDefaultValues {
  name?: string;
  email?: string;
  plan?: string;
  description?: string;
  customerId?: string;
}

export function QuickFormDialog({
  trigger,
  title,
  description,
  type = "general",
  defaultValues,
  customerId,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  type?: "general" | "note" | "meeting" | "customer" | "product";
  defaultValues?: QuickFormDefaultValues;
  customerId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState(defaultValues?.name || "");
  const [formContent, setFormContent] = useState(defaultValues?.description || "");

  useEffect(() => {
    if (open) {
      setFormName(defaultValues?.name || "");
      setFormContent(defaultValues?.description || "");
    }
  }, [open, defaultValues?.name, defaultValues?.description]);

  const save = async () => {
    if (type === "note") {
      const targetCustomerId =
        customerId ||
        defaultValues?.customerId ||
        (typeof window !== "undefined"
          ? window.location.pathname.match(/\/customers\/([^/?#]+)/)?.[1]
          : undefined);

      if (!targetCustomerId) {
        toast.error("Customer ID is required to create a note");
        return;
      }

      if (!formContent.trim()) {
        toast.error("Note content is required");
        return;
      }

      setSaving(true);
      try {
        let token = "";
        try {
          const session = await fetchAuthSession();
          token =
            session?.tokens?.idToken?.toString() ||
            session?.tokens?.accessToken?.toString() ||
            "";
        } catch (authErr) {
          console.warn("Could not retrieve Cognito auth session:", authErr);
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const isLocal =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1");

        const targetUrl = isLocal
          ? "/api/notes"
          : "https://api.superblock.chat/customeranalyticsdashboard/notes";

        const requestBody = {
          customerId: targetCustomerId,
          customer_id: targetCustomerId,
          title: formName.trim() || undefined,
          content: formContent.trim(),
        };

        const response = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.error || `Failed to save note (HTTP ${response.status})`
          );
        }

        if (!data || data.success === false) {
          throw new Error(
            data?.error || "Backend reported failure saving note"
          );
        }

        // Strictly verify that a persisted note was returned by the database INSERT
        const createdNote = data.note || data.data;
        if (!createdNote || !createdNote.id) {
          throw new Error(
            "Backend failed to persist note to database (no created note returned)"
          );
        }

        toast.success("Note saved", {
          description: "Your note has been saved to the database.",
        });
        setOpen(false);
        setFormName("");
        setFormContent("");

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("customer-operations-updated", {
              detail: { customerId: targetCustomerId, note: createdNote },
            })
          );
          window.dispatchEvent(
            new CustomEvent("customer-note-created", {
              detail: { customerId: targetCustomerId, note: createdNote },
            })
          );
        }
      } catch (err: any) {
        console.error("Error creating note:", err);
        toast.error(err?.message || "Failed to save note");
      } finally {
        setSaving(false);
      }
      return;
    }

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
          <div className="grid gap-1.5"><Label htmlFor={`${title}-name`} className="text-xs">{type === "meeting" ? "Meeting title" : type === "note" ? "Note title" : type === "customer" ? "Company name" : "Name"}</Label><Input id={`${title}-name`} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={type === "meeting" ? "Q4 strategy review" : type === "note" ? "Add a clear title" : "Enter a name"} /></div>
          {type === "customer" && <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label className="text-xs">Contact email</Label><Input type="email" defaultValue={defaultValues?.email} placeholder="owner@company.com" /></div><div className="grid gap-1.5"><Label className="text-xs">Plan</Label><Select defaultValue={defaultValues?.plan || "growth"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="starter">Starter</SelectItem><SelectItem value="growth">Growth</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent></Select></div></div>}
          {type === "meeting" && <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label className="text-xs">Date</Label><Input type="date" /></div><div className="grid gap-1.5"><Label className="text-xs">Owner</Label><Select defaultValue="anika"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="anika">Anika Shah</SelectItem><SelectItem value="karan">Karan Mehta</SelectItem><SelectItem value="rishi">Rishi Kapoor</SelectItem></SelectContent></Select></div></div>}
          <div className="grid gap-1.5"><Label className="text-xs">{type === "note" ? "Note" : type === "meeting" ? "Discussion summary" : "Description"}</Label><Textarea rows={4} value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="Add context for your team…" /></div>
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
