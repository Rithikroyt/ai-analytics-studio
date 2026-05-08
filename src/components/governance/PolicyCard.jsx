import { Shield, AlertTriangle, CheckCircle2, Trash2, Lock, Archive, Eye } from 'lucide-react';

const TYPE_ICONS = { masking: Lock, retention: Archive, access_control: Eye, quality_threshold: Shield, compliance: CheckCircle2 };
const TYPE_COLORS = {
  masking: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  retention: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  access_control: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  quality_threshold: 'text-green-400 bg-green-400/10 border-green-400/20',
  compliance: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
};
const SEV_COLORS = { info: 'text-blue-400', warning: 'text-amber-400', critical: 'text-red-400' };

export default function PolicyCard({ policy, violation, onDelete }) {
  const Icon = TYPE_ICONS[policy.policyType] || Shield;
  const color = TYPE_COLORS[policy.policyType] || 'text-white/50 bg-white/5 border-white/10';

  return (
    <div className={`glass-card rounded-2xl p-5 border transition-all ${violation ? 'border-red-400/25 bg-red-400/3' : 'border-white/8 hover:border-white/15'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold">{policy.name}</div>
            <div className={`text-xs px-1.5 py-0.5 rounded-full border font-medium inline-block mt-0.5 ${color}`}>{policy.policyType}</div>
          </div>
        </div>
        <button onClick={onDelete} className="p-1.5 text-white/20 hover:text-red-400 rounded-lg hover:bg-white/5 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      {policy.description && <p className="text-xs text-white/50 mb-3 leading-relaxed">{policy.description}</p>}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`flex items-center gap-1 ${SEV_COLORS[policy.severity] || 'text-white/30'}`}>
          <AlertTriangle className="w-3 h-3" />{policy.severity}
        </span>
        <span className="text-white/30">Enforcement: {policy.enforcement}</span>
        {policy.complianceFramework && <span className="px-1.5 py-0.5 bg-white/5 rounded-full">{policy.complianceFramework}</span>}
      </div>
      {violation && (
        <div className="mt-3 p-2 rounded-lg bg-red-400/10 border border-red-400/20 text-xs text-red-300 flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {violation.message}
        </div>
      )}
    </div>
  );
}