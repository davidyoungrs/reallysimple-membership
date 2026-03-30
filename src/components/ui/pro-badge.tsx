import { Zap } from 'lucide-react';

export function ProBadge() {
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black tracking-widest uppercase bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30 shrink-0">
            <Zap className="w-3 h-3 fill-white" />
            PRO
        </span>
    );
}
