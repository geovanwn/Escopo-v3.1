import React from 'react';
import { Loader2 } from 'lucide-react';

export const CRMField = ({ label, name, value, onChange, required = false, type = "text", onBlur, isLoading, className, wrapperClassName, ...props }: any) => (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName || ''}`}>
        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">{label} {required && <span className="text-red-500">*</span>}</label>
        <div className="relative">
            <input
                type={type}
                name={name}
                required={required}
                className={`w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none hover:border-emerald-500/50 transition-all placeholder:text-[var(--text-secondary)]/30 shadow-sm disabled:opacity-50 disabled:bg-[var(--bg-secondary)] ${className || ''}`}
                value={value || ''}
                onChange={onChange}
                onBlur={onBlur}
                {...props}
            />
            {isLoading ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                </div>
            ) : null}
        </div>
    </div>
);

export const CRMSelect = ({ label, name, value, onChange, required = false, children, className, wrapperClassName, ...props }: any) => (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName || ''}`}>
        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">{label} {required && <span className="text-red-500">*</span>}</label>
        <select name={name} required={required} className={`w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none hover:border-emerald-500/50 transition-all shadow-sm disabled:opacity-50 disabled:bg-[var(--bg-secondary)] cursor-pointer ${className || ''}`} value={value || ''} onChange={onChange} {...props}>
            {children}
        </select>
    </div>
);

export const CRMTextArea = ({ label, name, value, onChange, required = false, className, wrapperClassName, rows = 4, ...props }: any) => (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName || ''}`}>
        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">{label} {required && <span className="text-red-500">*</span>}</label>
        <textarea
            name={name}
            required={required}
            className={`w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none hover:border-emerald-500/50 transition-all placeholder:text-[var(--text-secondary)]/30 shadow-sm disabled:opacity-50 disabled:bg-[var(--bg-secondary)] custom-scrollbar resize-y ${className || ''}`}
            rows={rows}
            value={value || ''}
            onChange={onChange}
            {...props}
        />
    </div>
);

export const TabButton = ({ id, label, current, set, icon: Icon }: any) => {
    const isActive = current === id;
    return (
        <button
            type="button"
            onClick={() => set(id)}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all duration-300 rounded-xl whitespace-nowrap overflow-hidden group ${isActive
                ? 'text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 font-bold shadow-sm ring-1 ring-blue-500/20'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                }`}
        >
            {isActive && (
                <span className="absolute left-0 w-1 h-3/4 bg-blue-500 rounded-r-md top-1/2 -translate-y-1/2" />
            )}
            {Icon && (
                <Icon
                    size={18}
                    className={`transition-colors duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'
                        }`}
                />
            )}
            <span className="tracking-tight">{label}</span>
        </button>
    );
};
