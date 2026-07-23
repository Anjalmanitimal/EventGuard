import { Check, X } from "lucide-react";

const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "A lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "An uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "A number", test: (v) => /[0-9]/.test(v) },
  { label: "A symbol", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function isPasswordValid(password: string) {
  return RULES.every((rule) => rule.test(password));
}

export default function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  return (
    <ul className="flex flex-col gap-1">
      {RULES.map(({ label, test }) => {
        const met = test(password);
        return (
          <li
            key={label}
            className={`flex items-center gap-1.5 text-xs ${met ? "text-success" : "text-muted"}`}
          >
            {met ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <X className="size-3.5" aria-hidden="true" />
            )}
            {label}
          </li>
        );
      })}
    </ul>
  );
}
