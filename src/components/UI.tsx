import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: 'peak' | 'normal' | 'valley' | 'danger' | 'info' | 'warning' | 'success';
}

const colorMap = {
  peak: 'bg-industrial-peak',
  normal: 'bg-industrial-normal',
  valley: 'bg-industrial-valley',
  danger: 'bg-industrial-danger',
  info: 'bg-industrial-info',
  warning: 'bg-industrial-warning',
  success: 'bg-industrial-success',
};

export function StatCard({ label, value, icon, trend, trendUp, color = 'info' }: StatCardProps) {
  return (
    <div className="card-industrial p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${colorMap[color]}`} />
      <div className="pl-3">
        <div className="stat-label">{label}</div>
        <div className="flex items-end gap-3 mt-2">
          <div className="stat-value animate-number-roll">{value}</div>
          {trend && (
            <div className={`font-mono text-sm font-semibold mb-1 ${trendUp ? 'text-industrial-success' : 'text-industrial-danger'}`}>
              {trendUp ? '▲' : '▼'} {trend}
            </div>
          )}
        </div>
      </div>
      {icon && (
        <div className="absolute right-4 top-4 opacity-15">
          {icon}
        </div>
      )}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display font-bold text-3xl uppercase tracking-wider text-steel-900">
          {title}
        </h1>
        {subtitle && (
          <p className="font-mono text-sm text-steel-500 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-steel-900/60" onClick={onClose} />
      <div className="relative card-industrial w-full max-w-lg max-h-[90vh] overflow-hidden animate-fade-in">
        <div className="bg-steel-800 text-white px-5 py-4 flex items-center justify-between border-b-2 border-steel-900">
          <h3 className="font-display font-bold text-lg uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="hover:bg-steel-700 p-1 rounded transition-colors">
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-9rem)] scrollbar-industrial">
          {children}
        </div>
        {footer && (
          <div className="bg-steel-50 px-5 py-4 border-t-2 border-steel-900 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card-industrial-sm p-12 text-center bg-gradient-stripes">
      {icon && <div className="text-steel-400 mb-4 flex justify-center">{icon}</div>}
      <h3 className="font-display font-bold text-xl uppercase tracking-wider text-steel-700 mb-2">{title}</h3>
      {description && <p className="font-mono text-sm text-steel-500 mb-4">{description}</p>}
      {action}
    </div>
  );
}

interface TagProps {
  type: 'peak' | 'normal' | 'valley' | 'danger' | 'warning' | 'info' | 'success';
  children: ReactNode;
  className?: string;
}

export function Tag({ type, children, className = '' }: TagProps) {
  const cls = {
    peak: 'badge-peak',
    normal: 'badge-normal',
    valley: 'badge-valley',
    danger: 'badge-danger',
    warning: 'badge-warning',
    info: 'badge-info',
    success: 'badge-success',
  }[type];
  return <span className={`${cls} ${className}`}>{children}</span>;
}
