interface StubPageProps {
  title: string;
  body?: string;
}

export default function StubPage({ title, body }: StubPageProps) {
  return (
    <div className="p-10">
      <div className="max-w-2xl mx-auto text-center mt-16">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Coming soon</div>
        <div className="text-[28px] font-semibold tracking-tight mt-2">{title}</div>
        {body && <div className="text-sm text-slate-500 mt-3">{body}</div>}
      </div>
    </div>
  );
}
