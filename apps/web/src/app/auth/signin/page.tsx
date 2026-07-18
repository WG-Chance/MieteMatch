import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@flowdesk/ui";

async function googleSignIn() {
  "use server";
  await signIn("google", { redirectTo: "/onboarding" });
}

export default async function SignInPage() {
  const session = await auth();
  if (session?.user?.organizationId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/6 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-600/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" fill="white" opacity="0.9"/>
              <path d="M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0" fill="white"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Welcome to FlowDesk</h1>
          <p className="text-slate-400 text-sm mt-2">AI-powered customer support for modern teams</p>
        </div>
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
          <form action={googleSignIn}>
            <Button type="submit" className="w-full h-12 text-base">
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </form>
          <p className="text-xs text-slate-500 text-center mt-5 leading-relaxed">
            By signing in you agree to our{" "}
            <a href="#" className="text-indigo-400 hover:underline">Terms</a> and{" "}
            <a href="#" className="text-indigo-400 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
