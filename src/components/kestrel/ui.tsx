import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";
import type { Severity } from "@/lib/kestrel/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonStyles = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      tone: {
        primary: "bg-copper font-serif text-base text-ink hover:bg-copper-2",
        quiet: "border border-line bg-transparent font-serif text-base text-fg hover:border-copper",
        meta: "border border-line bg-transparent font-mono text-xs uppercase tracking-widest text-muted hover:border-copper hover:text-fg",
      },
    },
    defaultVariants: { tone: "primary" },
  },
);

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>
>(function Button({ tone, className, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={cn(buttonStyles({ tone }), className)} {...props} />;
});

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-widest text-copper">{children}</p>
  );
}

export function TextInput({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{label}</span>
      <input
        className={cn(
          "h-11 w-full min-w-0 border border-line bg-bg px-3 font-mono text-sm text-fg outline-none focus:border-copper",
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function TextArea({
  label,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{label}</span>
      <textarea
        className={cn(
          "min-h-28 w-full min-w-0 border border-line bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-copper",
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function Paper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <pre
      className={cn(
        "max-h-64 overflow-auto whitespace-pre-wrap break-words bg-paper p-3 font-mono text-xs leading-relaxed text-ink",
        className,
      )}
    >
      {children}
    </pre>
  );
}

const chip: Record<Severity, string> = {
  critical: "bg-alert text-ink",
  high: "bg-copper text-ink",
  medium: "border border-line text-fg",
  low: "border border-line text-muted",
};

export function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center px-2 font-mono text-xs uppercase tracking-widest",
        chip[severity],
      )}
    >
      {severity}
    </span>
  );
}

export function Panel({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 border border-line bg-surface">
      {(eyebrow || title || action) && (
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            {title ? <h2 className="mt-1 font-serif text-2xl leading-tight">{title}</h2> : null}
          </div>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
