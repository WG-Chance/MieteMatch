"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "@flowdesk/ui";
import { Loader2, CheckCircle } from "lucide-react";

interface Org { id: string; name: string; website: string | null; timezone: string; slug: string; }

export function OrgSettingsForm({ org, canEdit }: { org: Org; canEdit: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: org.name, website: org.website ?? "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 3000); }
    } finally { setLoading(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Organization Name</Label>
            <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              disabled={!canEdit} required />
          </div>
          <div>
            <Label>Website</Label>
            <Input className="mt-1" type="url" placeholder="https://example.com"
              value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              disabled={!canEdit} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input className="mt-1" value={org.slug} disabled />
            <p className="text-xs text-slate-500 mt-1">Used in URLs. Contact support to change.</p>
          </div>
          {canEdit && (
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
