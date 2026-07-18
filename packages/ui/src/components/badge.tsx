import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils";
const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", {
  variants: { variant: {
    default: "border-transparent bg-indigo-600/20 text-indigo-300",
    secondary: "border-transparent bg-slate-700 text-slate-300",
    destructive: "border-transparent bg-red-900/40 text-red-400",
    success: "border-transparent bg-emerald-900/40 text-emerald-400",
    warning: "border-transparent bg-yellow-900/40 text-yellow-400",
    outline: "border-slate-600 text-slate-300",
    critical: "border-transparent bg-red-600 text-white",
    high: "border-transparent bg-orange-900/40 text-orange-400",
    medium: "border-transparent bg-yellow-900/40 text-yellow-400",
    low: "border-transparent bg-slate-700 text-slate-400",
  }},
  defaultVariants: { variant: "default" },
});
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
function Badge({ className, variant, ...props }: BadgeProps) { return <div className={cn(badgeVariants({ variant }), className)} {...props} />; }
export { Badge, badgeVariants };
