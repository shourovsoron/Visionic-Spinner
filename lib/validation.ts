export type CustomerType = "individual" | "business";
export type YesNo = "yes" | "no";

export interface SpinFormInput {
  fullName: string;
  phone: string;
  email: string;
  customerType: string;
  website: string;
  lookingForDesign: string;
}

export interface ValidatedSpinInput {
  fullName: string;
  phone: string;
  email: string;
  customerType: CustomerType;
  website?: string;
  lookingForDesign: YesNo;
}

export interface FieldErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  customerType?: string;
  website?: string;
  lookingForDesign?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts digits with optional +, spaces, dashes, parens; requires 7-15 significant digits (E.164-ish).
const PHONE_RE = /^\+?[0-9()\-\s]{7,20}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  if (!PHONE_RE.test(phone.trim())) return false;
  const digitCount = phone.replace(/[^0-9]/g, "").length;
  return digitCount >= 7 && digitCount <= 15;
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateSpinInput(input: SpinFormInput): {
  valid: boolean;
  errors: FieldErrors;
  data?: ValidatedSpinInput;
} {
  const errors: FieldErrors = {};

  const fullName = (input.fullName ?? "").trim();
  if (!fullName) {
    errors.fullName = "Full name is required.";
  } else if (fullName.length < 2) {
    errors.fullName = "Enter your full name.";
  } else if (fullName.length > 100) {
    errors.fullName = "Full name is too long.";
  }

  const phone = (input.phone ?? "").trim();
  if (!phone) {
    errors.phone = "Phone number is required.";
  } else if (!isValidPhone(phone)) {
    errors.phone = "Enter a valid phone number.";
  }

  const email = (input.email ?? "").trim();
  if (!email) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  const customerType = (input.customerType ?? "").trim();
  if (customerType !== "individual" && customerType !== "business") {
    errors.customerType = "Select a customer type.";
  }

  const website = (input.website ?? "").trim();
  if (website && !isValidUrl(website)) {
    errors.website = "Enter a valid URL (including http:// or https://).";
  }

  const lookingForDesign = (input.lookingForDesign ?? "").trim();
  if (lookingForDesign !== "yes" && lookingForDesign !== "no") {
    errors.lookingForDesign = "Please select an option.";
  }

  const valid = Object.keys(errors).length === 0;

  return {
    valid,
    errors,
    data: valid
      ? {
          fullName,
          phone: normalizePhone(phone),
          email: normalizeEmail(email),
          customerType: customerType as CustomerType,
          website: website || undefined,
          lookingForDesign: lookingForDesign as YesNo,
        }
      : undefined,
  };
}
