// src/components/ChatInterface.tsx

import { MessageSquare, Send } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";

export interface ChatMessage {
    author: 'user' | 'server';
    text: string;
}

export interface PendingQuestion {
    id: string;
    text: string;
    type: 'free_text' | 'multiple_choice';
    options?: string[];
}

interface ChatInterfaceProps {
    history: ChatMessage[];
    pendingQuestion: PendingQuestion | null;
    onSendMessage: (message: string, questionId?: string) => void;
}

export const ChatInterface = ({ history, pendingQuestion, onSendMessage }: ChatInterfaceProps) => {
    const [inputValue, setInputValue] = useState("");
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [history]);

    const handleSend = () => {
        if (inputValue.trim() === "" && (!pendingQuestion || pendingQuestion.type !== 'multiple_choice')) return;
        onSendMessage(inputValue, pendingQuestion?.id);
        setInputValue("");
    };

    const handleOptionClick = (option: string) => {
        onSendMessage(option, pendingQuestion?.id);
        setInputValue("");
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <section className="flex flex-col h-full">
            <div className="flex items-center mb-4">
                <MessageSquare className="mr-3 text-indigo-300" />
                <h2 className="text-2xl font-semibold text-white/90">Server Chat</h2>
            </div>

            <div className="glass-card flex-grow flex flex-col p-0 overflow-hidden">
                {/* Message Display Area */}
                <div className="card-content flex-grow p-6 overflow-y-auto space-y-4">
                    {history.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-3 ${msg.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                           {msg.author === 'server' && <div className="w-8 h-8 rounded-full bg-indigo-500/50 flex-shrink-0"></div>}
                           <div className={`chat-bubble ${msg.author === 'user' ? 'chat-bubble--user' : 'chat-bubble--server'}`}>
                                {msg.text}
                           </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="card-content border-t border-white/10 p-4 bg-black/20">
                    {pendingQuestion && (
                        <div className="mb-3">
                            <p className="text-sm text-yellow-300 mb-2 font-semibold">Awaiting your response:</p>
                             {pendingQuestion.type === 'multiple_choice' && pendingQuestion.options && (
                                <div className="flex flex-wrap gap-2">
                                    {pendingQuestion.options.map(option => (
                                        <button key={option} onClick={() => handleOptionClick(option)} className="glass-button glass-button--indigo text-sm">
                                            {option}
                                        </button>
                                    ))}
                                </div>
                             )}
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={pendingQuestion ? "Type your answer..." : "Chat is idle..."}
                            className="chat-input"
                            disabled={pendingQuestion?.type === 'multiple_choice'}
                        />
                        <button onClick={handleSend} disabled={!inputValue.trim()} className="glass-button glass-button--green flex-shrink-0">
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};