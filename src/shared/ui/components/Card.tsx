import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  variant?: "default" | "highlighted" | "warning";
  className?: string;
  hover?: boolean;
}

const variants = {
  default:     "bg-white border border-slate-200",
  highlighted: "bg-primary-50 border border-primary-200",
  warning:     "bg-warning-50 border border-warning-200",
};

export default function Card({
  children,
  title,
  description,
  actions,
  variant = "default",
  className = "",
  hover = false,
}: CardProps) {
  return (
    <div
      className={`${variants[variant]} rounded-xl shadow-card p-6 transition-all duration-200 ${
        hover ? "hover:shadow-card-hover hover:-translate-y-0.5" : ""
      } ${className}`}
    >
      {(title || description || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {title       && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 ml-4">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
