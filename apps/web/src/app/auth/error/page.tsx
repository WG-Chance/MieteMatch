import Link from "next/link";
import { Button } from "@flowdesk/ui";

export default function AuthErrorPage({ searchParams }: { searchParams: { error?: string } }) {
  const msg: Record<string, string> = {
    OAuthSignin: "Failed to start Google sign-in.",
    OAuthCallback: "Error during Google callback.",
    Default: "An authentication error occurred.",
  };
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center max-w-sm mx-4">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-slate-100 mb-2">Authentication Error</h1>
        <p className="text-slate-400 text-sm mb-6">{msg[searchParams.error ?? "Default"] ?? msg.Default}</p>
        <Link href="/auth/signin"><Button>Try Again</Button></Link>
      </div>
    </div>
  );
}
