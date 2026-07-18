"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Card, CardContent } from "@flowdesk/ui";
import { Loader2, Building2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", website: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, website: form.website || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error ?? "Failed to create organization");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/6 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl mb-5">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Set up your workspace</h1>
          <p className="text-slate-400 text-sm mt-2">Create your organization to start managing support tickets</p>
        </div>
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Organization name *</Label>
                <Input
                  id="name" className="mt-1.5" placeholder="Acme Inc."
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required minLength={2} maxLength={60}
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website" type="url" className="mt-1.5" placeholder="https://acme.com"
                  value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !form.name.trim()}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create workspace →"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
