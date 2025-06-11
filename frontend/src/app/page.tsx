// src/app/page.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { ApprovalCard, ToolCall } from "@/components/ApprovalCard";
import { Check, ChevronsRight, Server, Trash2, XCircle } from "lucide-react";

// Import the new CSS file
import './frosty.css';

// --- Floating Orbs Component ---
const FloatingOrbs = () => (
  <div className="floating-orbs">
    <div className="orb"></div>
    <div className="orb"></div>
    <div className="orb"></div>
  </div>
);

type LogItem = ToolCall & { status?: 'pending' | 'auto_approved' | 'approved_and_executed' | 'denied' };

export default function HomePage() {
  const [pending, setPending] = useState<ToolCall[]>([]);
  const [log, setLog] = useState<LogItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const buttonsRef = useRef<NodeListOf<Element> | null>(null);

  // Action Handlers
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

  // WebSocket and Data Fetching
  useEffect(() => {
    const fetchInitialData = async () => {
  try {
    const response = await fetch("http://localhost:8000/api/tool_calls");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.pending) {
      throw new Error("Error: data.pending is undefined");
    }
    setPending(data.pending.map((p: any) => p.details));
    setLog(data.log);
  } catch (error) {
    console.error("Error fetching initial data:", error);
  }
};

    fetchInitialData();

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
  }, []); // Only runs on mount and unmount


  // Interactive Effects
  useEffect(() => {
    // Add subtle parallax effect to orbs on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      const orbs = document.querySelectorAll('.orb');
      const mouseX = e.clientX / window.innerWidth;
      const mouseY = e.clientY / window.innerHeight;

      orbs.forEach((orb, index) => {
        const speed = (index + 1) * 0.02;
        const x = (mouseX - 0.5) * speed * 100;
        const y = (mouseY - 0.5) * speed * 100;
        (orb as HTMLElement).style.transform = `translate(${x}px, ${y}px)`;
      });
    };
    document.addEventListener('mousemove', handleMouseMove);

    // Add click ripple effect to buttons
    const handleButtonClick = (e: MouseEvent) => {
      const button = (e.currentTarget as HTMLElement);
      const ripple = document.createElement('div');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px; height: ${size}px;
        left: ${x}px; top: ${y}px;
        background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
    `;
      button.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    };

    buttonsRef.current = document.querySelectorAll('.glass-button');
    buttonsRef.current.forEach(button => button.addEventListener('click', handleButtonClick));

    // Cleanup event listeners
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      buttonsRef.current?.forEach(button => button.removeEventListener('click', handleButtonClick));
    };
  }, []); // Runs only on mount and unmount.  No dependencies.


  return (
    <main className="frosty-background">
      <FloatingOrbs />
      <div className="container mx-auto p-4 md:p-8 relative z-10">
        <header className="flex items-center justify-between mb-8 border-b border-white/20 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>MCP Human-in-the-Loop</h1>
            <p className="text-white/70">Real-time LLM Tool Approval Dashboard</p>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-semibold border ${isConnected ? 'bg-green-500/20 text-green-200 border-green-400/30' : 'bg-red-500/20 text-red-200 border-red-400/30'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </header>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-white/90">Approval Queue ({pending.length})</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBatchApprove}
                disabled={selectedIds.size === 0}
                className="glass-button glass-button--indigo"
              >
                <Check size={18} />
                <span>Approve Selected ({selectedIds.size})</span>
              </button>
              <button
                onClick={handleBatchDeny}
                disabled={selectedIds.size === 0}
                className="glass-button glass-button--red"
              >
                <Trash2 size={18} />
                <span>Deny Selected ({selectedIds.size})</span>
              </button>
            </div>
          </div>
          <div className="space-y-6" style={{ perspective: '1000px' }}>
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
              <div className="glass-card text-center py-16">
                <div className="card-content">
                  <p className="text-white/70">No tools are currently waiting for approval.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4 text-white/90">Execution Log</h2>
          <div className="glass-card p-4 h-96 overflow-y-auto font-mono text-sm">
            <div className="card-content">
              {log.slice().reverse().map(l => (
                <div key={l.id} className="flex items-start space-x-3 py-2 border-b border-white/10 last:border-b-0">
                  <div className="flex-shrink-0 pt-1">
                    {l.status === 'pending' && <ChevronsRight className="text-yellow-400" size={16} />}
                    {l.status === 'auto_approved' && <Check className="text-blue-400" size={16} />}
                    {l.status === 'approved_and_executed' && <Check className="text-green-400" size={16} />}
                    {l.status === 'denied' && <XCircle className="text-red-400" size={16} />}
                  </div>
                  <div className="flex-grow">
                    <span className="text-purple-300">{l.tool_name}</span>
                    <span className="text-white/50"> ({(l.status || 'unknown').replace(/_/g, ' ')})</span>
                    <p className="text-white/70 break-all">
                      {JSON.stringify(l.kwargs)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}