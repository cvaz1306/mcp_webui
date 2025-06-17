// src/app/page.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { Check, MessageSquare, ChevronsRight, Server, Trash2, XCircle } from "lucide-react";
import { ApprovalQueue, ToolCallLogItem } from "@/components/ApprovalQueue";
import { ChatInterface, ChatMessage, PendingQuestion } from "@/components/ChatInterface";

import './frosty.css';

export default function HomePage() {
  // --- STATE MANAGEMENT ---
  const [pending, setPending] = useState<ToolCallLogItem[]>([]);
  const [log, setLog] = useState<ToolCallLogItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  
  // New state for Chat Interface
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // --- ACTION HANDLERS (Tool Approval) ---
  const handleApprove = async (id: string, args: Record<string, any>) => {
    await fetch(`http://localhost:8000/api/approve/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modifications: args }),
    });
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
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  // --- ACTION HANDLERS (Chat) ---
  const handleSendMessage = (message: string, questionId?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        type: "user_response",
        payload: {
          text: message,
          question_id: questionId,
        },
      };
      wsRef.current.send(JSON.stringify(payload));
      
      // Optimistic UI update
      setChatHistory(prev => [...prev, { author: 'user', text: message }]);
      if (questionId) {
        setPendingQuestion(null); // Assume question is resolved on send
      }
    }
  };

  // --- WEBSOCKET AND DATA FETCHING ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/tool_calls");
        const data = await response.json();
        if (data.pending) setPending(data.pending.map((p: any) => ({ ...p.details, status: 'pending' })));
        if (data.log) setLog(data.log);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();

    const ws = new WebSocket("ws://localhost:8000/ws");
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        // Tool call messages
        case "initial_state":
          setPending(message.payload.pending.map((p: any) => ({...p.details, status: 'pending'})));
          setLog(message.payload.log);
          break;
        case "new_request":
          const newRequest = { ...message.payload, status: 'pending' };
          setPending((prev) => [...prev, newRequest]);
          setLog((prev) => [...prev, newRequest]);
          break;
        case "request_approved":
          setPending((prev) => prev.filter((p) => p.id !== message.payload.id));
          setLog(prev => prev.map(l => l.id === message.payload.id ? { ...l, status: 'approved_and_executed' } : l));
          break;
        case "request_denied":
          setPending((prev) => prev.filter((p) => p.id !== message.payload.id));
          setLog(prev => prev.map(l => l.id === message.payload.id ? { ...l, status: 'denied' } : l));
          break;
        case "log_update":
          setLog((prev) => [...prev, message.payload]);
          break;

        // New chat messages
        case "new_question":
          setPendingQuestion(message.payload);
          setChatHistory(prev => [...prev, { author: 'server', text: message.payload.text }]);
          break;
        case "new_chat_message":
          setChatHistory(prev => [...prev, message.payload]);
          break;
        case "question_resolved":
            // This can be used for server-side confirmation if optimistic update isn't enough
            if (pendingQuestion?.id === message.payload.id) {
                setPendingQuestion(null);
            }
            break;
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  // --- RESPONSIVE LAYOUT LOGIC ---
  // On small screens, prioritize showing a pending question over the approval queue.
  const showChatOnMobile = pendingQuestion !== null;
  const showQueueOnMobile = !showChatOnMobile;

  return (
    <main className="frosty-background">
      <div className="container mx-auto p-4 md:p-8 relative z-10">
        <header className="flex items-center justify-between mb-8 border-b border-white/20 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>MCP Human-in-the-Loop</h1>
            <p className="text-white/70">Real-time LLM Tool & Chat Approval Dashboard</p>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-semibold border ${isConnected ? 'bg-green-500/20 text-green-200 border-green-400/30' : 'bg-red-500/20 text-red-200 border-red-400/30'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </header>

        {/* Main Content Area: Split Screen */}
        <div className="flex flex-col lg:flex-row lg:space-x-8 space-y-8 lg:space-y-0">
          
          {/* Left Panel: Approval Queue */}
          <div className={`lg:w-1/2 ${showQueueOnMobile ? 'block' : 'hidden'} lg:block`}>
            <ApprovalQueue
              pending={pending}
              selectedIds={selectedIds}
              onApprove={handleApprove}
              onDeny={handleDeny}
              onSelect={toggleSelection}
              onBatchApprove={handleBatchApprove}
              onBatchDeny={handleBatchDeny}
            />
          </div>

          {/* Right Panel: Chat Interface */}
          <div className={`lg:w-1/2 ${showChatOnMobile ? 'block' : 'hidden'} lg:block`}>
             <ChatInterface 
                history={chatHistory}
                pendingQuestion={pendingQuestion}
                onSendMessage={handleSendMessage}
             />
          </div>
        </div>

        {/* Execution Log (Full Width) */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4 text-white/90">Execution Log</h2>
           <div className="glass-card p-4 h-64 overflow-y-auto font-mono text-sm">
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