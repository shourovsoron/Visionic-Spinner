"use client";

import { useMemo, useState } from "react";
import { validateSpinInput, type FieldErrors, type SpinFormInput } from "@/lib/validation";
import Spinner from "@/components/ui/Spinner";

export interface SpinSuccessPayload {
  prize: string;
  prizeLabel: string;
  couponCode: string | null;
}

interface SpinFormProps {
  onSuccess: (payload: SpinSuccessPayload) => void;
  onAlreadyParticipated: () => void;
  onExhausted: () => void;
}

const initialForm: SpinFormInput = {
  phone: "",
  email: "",
  customerType: "",
  website: "",
  lookingForDesign: "",
};

export default function SpinForm({ onSuccess, onAlreadyParticipated, onExhausted }: SpinFormProps) {
  const [form, setForm] = useState<SpinFormInput>(initialForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { valid, errors } = useMemo(() => validateSpinInput(form), [form]);

  function markTouched(field: string) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  function fieldError(field: keyof FieldErrors): string | undefined {
    return touched[field] ? errors[field] : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      phone: true,
      email: true,
      customerType: true,
      website: true,
      lookingForDesign: true,
    });

    if (!valid || submitting) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess({ prize: data.prize, prizeLabel: data.prizeLabel, couponCode: data.couponCode ?? null });
        return;
      }

      if (data.code === "ALREADY_PARTICIPATED") {
        onAlreadyParticipated();
        return;
      }

      if (data.code === "CAMPAIGN_EXHAUSTED") {
        onExhausted();
        return;
      }

      setFormError(data.message || "Something went wrong. Please try again.");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-lg animate-fade-up rounded-2xl border border-neutral-200 dark:border-ink-700/60 bg-white dark:bg-ink-900/70 p-6 shadow-premium backdrop-blur sm:p-8"
    >
      <div className="mb-6 space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-ink-100 sm:text-2xl">
          Enter your details
        </h2>
        <p className="text-sm text-neutral-600 dark:text-ink-300">Fill out the form below to unlock your spin.</p>
      </div>

      <div className="space-y-5">
        <Field label="Phone Number" htmlFor="phone" error={fieldError("phone")} required>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 555 123 4567"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            onBlur={() => markTouched("phone")}
            aria-invalid={Boolean(fieldError("phone"))}
            aria-describedby={fieldError("phone") ? "phone-error" : undefined}
            className={inputClass(Boolean(fieldError("phone")))}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={fieldError("email")} required>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            onBlur={() => markTouched("email")}
            aria-invalid={Boolean(fieldError("email"))}
            aria-describedby={fieldError("email") ? "email-error" : undefined}
            className={inputClass(Boolean(fieldError("email")))}
          />
        </Field>

        <FieldsetChoice
          legend="Customer Type"
          name="customerType"
          required
          value={form.customerType}
          onChange={(v) => {
            setForm((f) => ({ ...f, customerType: v }));
            markTouched("customerType");
          }}
          options={[
            { value: "individual", label: "Individual" },
            { value: "business", label: "Business" },
          ]}
          error={fieldError("customerType")}
        />

        <Field label="Website Link" htmlFor="website" error={fieldError("website")} hint="Optional">
          <input
            id="website"
            name="website"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://yourcompany.com"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            onBlur={() => markTouched("website")}
            aria-invalid={Boolean(fieldError("website"))}
            aria-describedby={fieldError("website") ? "website-error" : undefined}
            className={inputClass(Boolean(fieldError("website")))}
          />
        </Field>

        <FieldsetChoice
          legend="Looking for design services?"
          name="lookingForDesign"
          required
          value={form.lookingForDesign}
          onChange={(v) => {
            setForm((f) => ({ ...f, lookingForDesign: v }));
            markTouched("lookingForDesign");
          }}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          error={fieldError("lookingForDesign")}
        />
      </div>

      {formError && (
        <p role="alert" className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || submitting}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-ink-950 shadow-glow transition-all duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:from-neutral-200 dark:disabled:from-ink-600 disabled:to-neutral-300 dark:disabled:to-ink-700 disabled:text-neutral-400 dark:disabled:text-ink-400 disabled:shadow-none"
      >
        {submitting ? (
          <>
            <Spinner />
            Preparing your spin...
          </>
        ) : (
          "Take a Spin"
        )}
      </button>
    </form>
  );
}

function inputClass(hasError: boolean): string {
  return [
    "w-full rounded-lg border bg-white dark:bg-ink-800/80 px-4 py-2.5 text-sm text-neutral-900 dark:text-ink-100 placeholder:text-neutral-400 dark:placeholder:text-ink-400",
    "outline-none transition-colors focus:ring-2 focus:ring-gold-400/50",
    hasError ? "border-red-500/60 focus:border-red-500" : "border-neutral-300 dark:border-ink-600 focus:border-gold-400/70",
  ].join(" ");
}

function Field({
  label,
  htmlFor,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-neutral-700 dark:text-ink-200">
        <span>
          {label}
          {required && <span className="ml-0.5 text-gold-600 dark:text-gold-400">*</span>}
        </span>
        {hint && <span className="text-xs font-normal text-neutral-500 dark:text-ink-400">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function FieldsetChoice({
  legend,
  name,
  value,
  onChange,
  options,
  error,
  required,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-ink-200">
        {legend}
        {required && <span className="ml-0.5 text-gold-600 dark:text-gold-400">*</span>}
      </legend>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={legend}>
        {options.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={[
                "flex cursor-pointer items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                checked
                  ? "border-gold-400/80 bg-gold-400/10 text-gold-600 dark:text-gold-300"
                  : "border-neutral-300 dark:border-ink-600 bg-neutral-100 dark:bg-ink-800/60 text-neutral-600 dark:text-ink-300 hover:border-neutral-400 dark:hover:border-ink-500",
              ].join(" ")}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </fieldset>
  );
}
