"use client";

import { useEffect, useState } from "react";
import { ApprovalCard, ToolCall } from "@/components/ApprovalCard";
import { Check, ChevronsRight, Server, Trash2 } from "lucide-react";

export default function HomePage() {
  const [pending, setPending] = useState<ToolCall[]>([]);
  const [log, setLog] = useState<ToolCall[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case "initial_state":
          setPending(message.payload.pending.map((p: any) => p.details));
          setLog(message.payload.log);
          break;
        case "new_request":
          setPending((prev) => [...prev, message.payload]);
          setLog((prev) => [...prev, { ...message.payload, status: 'pending' }]);
          break;
        case "request_approved":
          setPending((prev) => prev.filter((p) => p.id !== message.payload.id));
          setLog(prev => prev.map(l => l.id === message.payload.id ? { ...l, status: 'approved_and_executed' } : l));
          break;
        case "log_update":
          setLog((prev) => [...prev, message.payload]);
          break;
      }
    };

    return () => ws.close();
  }, []);

  const handleApprove = async (id: string) => {
    await fetch(`http://localhost:8000/api/approve/${id}`, { method: "POST" });
  };

  const handleDeny = async (id: string) => {
    await fetch(`http://localhost:8000/api/deny/${id}`, { method: "POST" });
  };

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    await fetch(`http://localhost:8000/api/approve-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    setSelectedIds(new Set());
  };

  const handleBatchDeny = async () => {
    if (selectedIds.size === 0) return;
    await fetch(`http://localhost:8000/api/deny-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <main className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-800 dark:text-gray-200">
      <div className="container mx-auto p-4 md:p-8">
        <header className="flex items-center justify-between mb-8 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MCP Human-in-the-Loop</h1>
            <p className="text-gray-500 dark:text-gray-400">Real-time LLM Tool Approval Dashboard</p>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </header>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Approval Queue ({pending.length})</h2>
            <button
              onClick={handleBatchApprove}
              disabled={selectedIds.size === 0}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={18} />
              <span>Approve Selected ({selectedIds.size})</span>
            </button>
            <button
              onClick={handleBatchDeny}
              disabled={selectedIds.size === 0}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={18} />
              <span>Deny Selected ({selectedIds.size})</span>
            </button>
          </div>
          <div className="space-y-4">
            {pending.length > 0 ? (
              pending.map((toolCall) => (
                <ApprovalCard
                  key={toolCall.id}
                  toolCall={toolCall}
                  onApprove={handleApprove}
                  onDeny={handleDeny}
                  onSelect={toggleSelection}
                  isSelected={selectedIds.has(toolCall.id)}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-lg border border-dashed">
                <p className="text-gray-500 dark:text-gray-400">No tools are currently waiting for approval.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Execution Log</h2>
          <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-sm p-4 h-96 overflow-y-auto font-mono text-sm">
            {log.slice().reverse().map(l => (
              <div key={l.id} className="flex items-start space-x-3 py-1 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div className="flex-shrink-0 pt-1">
                  {l.status === 'pending' && <ChevronsRight className="text-yellow-500" size={16} />}
                  {l.status === 'auto_approved' && <Check className="text-blue-500" size={16} />}
                  {l.status === 'approved_and_executed' && <Check className="text-green-500" size={16} />}
                </div>
                <div className="flex-grow">
                  <span className="text-purple-400">{l.tool_name}</span>
                  <span className="text-gray-400">({l.status.replace(/_/g, ' ')})</span>
                  <p className="text-gray-600 dark:text-gray-300">
                    {JSON.stringify(l.kwargs)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
