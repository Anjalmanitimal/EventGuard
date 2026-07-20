import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type Variant = "error" | "success" | "info";

const styles: Record<Variant, { wrapper: string; icon: ReactNode }> = {
  error: {
    wrapper: "bg-danger-bg text-danger",
    icon: <AlertCircle className="size-4 shrink-0" aria-hidden="true" />,
  },
  success: {
    wrapper: "bg-success/10 text-success",
    icon: <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />,
  },
  info: {
    wrapper: "bg-brand/10 text-brand",
    icon: <Info className="size-4 shrink-0" aria-hidden="true" />,
  },
};

export default function Alert({ variant, children }: { variant: Variant; children: ReactNode }) {
  const { wrapper, icon } = styles[variant];
  return (
    <div className={`flex items-start gap-2 rounded-control px-3 py-2.5 text-sm ${wrapper}`}>
      {icon}
      <span>{children}</span>
    </div>
  );
}
