// src/components/ApprovalQueue.tsx

import { ApprovalCard, ToolCall } from "@/components/ApprovalCard";
import { Check, Trash2 } from "lucide-react";

export type ToolCallLogItem = ToolCall & { status?: 'pending' | 'auto_approved' | 'approved_and_executed' | 'denied' };

interface ApprovalQueueProps {
    pending: ToolCallLogItem[];
    selectedIds: Set<string>;
    onApprove: (id: string, args: Record<string, any>) => void;
    onDeny: (id: string) => void;
    onSelect: (id: string) => void;
    onBatchApprove: () => void;
    onBatchDeny: () => void;
}

export const ApprovalQueue = ({ pending, selectedIds, onApprove, onDeny, onSelect, onBatchApprove, onBatchDeny }: ApprovalQueueProps) => {
    return (
        <section>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-white/90">Approval Queue ({pending.length})</h2>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onBatchApprove}
                        disabled={selectedIds.size === 0}
                        className="glass-button glass-button--indigo"
                    >
                        <Check size={18} />
                        <span>Approve ({selectedIds.size})</span>
                    </button>
                    <button
                        onClick={onBatchDeny}
                        disabled={selectedIds.size === 0}
                        className="glass-button glass-button--red"
                    >
                        <Trash2 size={18} />
                        <span>Deny ({selectedIds.size})</span>
                    </button>
                </div>
            </div>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2" style={{ perspective: '1000px' }}>
                {pending.length > 0 ? (
                    pending.map((toolCall) => (
                        <ApprovalCard
                            key={toolCall.id}
                            toolCall={toolCall}
                            onApprove={onApprove}
                            onDeny={onDeny}
                            onSelect={onSelect}
                            isSelected={selectedIds.has(toolCall.id)}
                        />
                    ))
                ) : (
                    <div className="glass-card text-center py-16">
                        <div className="card-content">
                            <p className="text-white/70">No tools are currently waiting for approval.</p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};