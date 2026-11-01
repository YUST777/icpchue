/** One title block for every dashboard page: a plain title, one line under it, an optional action on the right. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h2 className="ui-page-title">{title}</h2>
                {subtitle && (
                    <p className="mt-2 max-w-2xl text-sm leading-5 text-[var(--color-text-secondary)]">{subtitle}</p>
                )}
            </div>
            {action}
        </div>
    );
}
