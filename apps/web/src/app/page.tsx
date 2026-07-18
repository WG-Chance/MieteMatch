import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button, Badge } from "@flowdesk/ui";
import { Zap, Sparkles, ShieldCheck, BarChart3, ArrowRight, CheckCircle, Ticket } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.organizationId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/4 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-100 tracking-tight">Flow<span className="text-indigo-400">Desk</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/auth/signin">
              <Button size="sm">Get started free <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-600/30 bg-indigo-950/40 text-indigo-400 text-xs font-medium mb-8">
            <Sparkles className="w-3 h-3" />
            AI-powered customer support · Multi-tenant · SLA enforcement
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-100 mb-6 leading-tight tracking-tight">
            Support operations
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              that scale with you
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            FlowDesk gives growing SaaS teams intelligent ticket management, AI triage, SLA tracking,
            and deep analytics — without the enterprise price tag.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signin">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Start for free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <p className="text-xs text-slate-600 mt-4">No credit card required · Free Starter plan</p>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Ticket, title: "Ticket Management", desc: "Unified inbox with priority queues, tagging, assignment, and internal notes." },
              { icon: Sparkles, title: "AI Triage", desc: "Automatic categorization, priority scoring, and sentiment analysis on every ticket." },
              { icon: ShieldCheck, title: "SLA Enforcement", desc: "Per-priority response windows with real-time breach detection and alerts." },
              { icon: BarChart3, title: "Analytics", desc: "Volume trends, SLA performance, agent workload, and channel breakdown." },
            ].map(f => (
              <div key={f.title} className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-indigo-600/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/15 border border-indigo-600/25 flex items-center justify-center mb-4">
                  <f.icon className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-slate-100 mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-100 mb-3">Simple, predictable pricing</h2>
            <p className="text-slate-400">Scale as your team grows. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { plan: "Starter", price: 29, seats: "3 agents", tickets: "500/mo", highlight: false,
                features: ["Ticket management","Customer widget","Email notifications","Basic reporting"] },
              { plan: "Growth", price: 79, seats: "10 agents", tickets: "2,000/mo", highlight: true,
                features: ["Everything in Starter","AI triage & categorization","SLA tracking","Analytics dashboard","API access"] },
              { plan: "Scale", price: 199, seats: "Unlimited agents", tickets: "Unlimited", highlight: false,
                features: ["Everything in Growth","Priority support","Custom SLA policies","Audit log export","Dedicated onboarding"] },
            ].map(p => (
              <div key={p.plan}
                className={`p-6 rounded-xl border ${p.highlight ? "border-indigo-600/50 bg-indigo-950/15" : "border-slate-800 bg-slate-900/50"}`}>
                {p.highlight && <Badge className="mb-3 text-xs">Most Popular</Badge>}
                <h3 className="font-bold text-slate-100 text-lg">{p.plan}</h3>
                <div className="text-3xl font-bold text-slate-100 my-3">
                  ${p.price}<span className="text-sm font-normal text-slate-400">/mo</span>
                </div>
                <p className="text-xs text-slate-500 mb-5">{p.seats} · {p.tickets}</p>
                <ul className="space-y-1.5 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signin">
                  <Button variant={p.highlight ? "default" : "outline"} className="w-full">Get started</Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-800 py-8 text-center text-xs text-slate-600">
        © 2024 FlowDesk ·{" "}
        <a href="#" className="hover:text-slate-400">Privacy</a> ·{" "}
        <a href="#" className="hover:text-slate-400 ml-2">Terms</a>
      </footer>
    </div>
  );
}
