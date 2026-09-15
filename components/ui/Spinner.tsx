const SIZES = {
  sm: { box: 16, stroke: 2 },
  md: { box: 28, stroke: 2.5 },
  lg: { box: 44, stroke: 3 },
} as const;

interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
}

export default function Spinner({ size = "sm", className = "" }: SpinnerProps) {
  const { box, stroke } = SIZES[size];
  return (
    <svg
      className={`animate-spin ${className}`}
      style={{ width: box, height: box }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={stroke} className="opacity-15" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  );
}
