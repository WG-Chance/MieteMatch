import Link from "next/link";
import { Button } from "@flowdesk/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center max-w-sm mx-4">
        <div className="text-6xl font-bold text-indigo-400/30 mb-4">404</div>
        <h1 className="text-xl font-bold text-slate-100 mb-2">Page not found</h1>
        <p className="text-slate-400 text-sm mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
      </div>
    </div>
  );
}
