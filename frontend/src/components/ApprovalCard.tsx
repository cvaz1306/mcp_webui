// src/components/ApprovalCard.tsx

import { FileWarning, Send, Trash2, ShieldAlert, Check, Square, CheckSquare, Server } from 'lucide-react';
import React, { useState } from 'react';
export interface ToolCall {
  id: string;
  tool_name: string;
  args: any[];
  kwargs: Record<string, any>;
  renderer: string;
  status: 'pending' | 'auto_approved' | 'approved_and_executed' | 'denied';
}

interface ApprovalCardProps {
  toolCall: ToolCall;
  onApprove: (id: string, updatedKwargs: Record<string, any>) => void;
  onDeny: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
}

// --- Custom Renderers (Redesigned for Glass UI) ---

const DefaultRenderer = ({ kwargs }: { kwargs: Record<string, any> }) => (
  <pre className="bg-black/20 p-3 rounded-md text-xs whitespace-pre-wrap break-all font-mono text-white/80">
    {JSON.stringify(kwargs, null, 2)}
  </pre>
);

interface EditableRendererProps {
  kwargs: Record<string, any>;
  onChange: (updated: Record<string, any>) => void;
}

const EditableRenderer = ({ kwargs, onChange }: EditableRendererProps) => {
  const [localKwargs, setLocalKwargs] = useState(kwargs);

  const handleChange = (key: string, value: any) => {
    const updated = { ...localKwargs, [key]: value };
    setLocalKwargs(updated);
    onChange(updated); // Notify parent of change
  };

  return (
    <div className="bg-blue-500/10 border border-blue-400/50 p-4 rounded-lg">
      <div className="flex items-center text-blue-300">
        <Square className="mr-3 flex-shrink-0" size={24} />
        <h4 className="font-bold text-lg">Editable Arguments</h4>
      </div>
      <ul className="mt-4 space-y-2 font-mono text-sm text-blue-200/90">
        {Object.entries(localKwargs).map(([key, value]) => (
          <li key={key} className="flex items-center">
            <span className="text-blue-300 font-semibold w-32">{key}</span>
            <div className="flex-grow">
              {typeof value === 'string' && (value.length > 40 || value.includes('\n')) ? (
                <textarea
                  value={value}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full p-1 rounded-md text-blue-300 bg-transparent border border-blue-400/50 resize-none"
                  rows={Math.max(1, value.split('\n').length)}
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full p-1 rounded-md text-blue-300 bg-transparent border border-blue-400/50"
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};


const FileSystemRenderer = ({ kwargs }: { kwargs: Record<string, any> }) => (
  <div className="bg-yellow-500/10 border border-yellow-400/50 p-4 rounded-lg">
    <div className="flex items-center text-yellow-300">
      <FileWarning className="mr-3 flex-shrink-0" size={24} />
      <h4 className="font-bold text-lg">Filesystem Operation</h4>
    </div>
    <p className="mt-2 text-yellow-400/90">
      This action will modify the filesystem.
    </p>
    <div className="mt-4 space-y-2 font-mono text-sm text-yellow-200/90">
      <p><strong>Path:</strong> <span className="text-yellow-300 font-semibold">{kwargs.path}</span></p>
      <p><strong>Recursive:</strong> <span className={kwargs.recursive ? 'font-bold text-yellow-300' : 'text-white/50'}>{String(kwargs.recursive)}</span></p>
    </div>
  </div>
);

const NukeLaunchRenderer = ({ kwargs }: { kwargs: Record<string, any> }) => (
  <div className="bg-red-500/10 border-2 border-dashed border-red-500/80 p-4 rounded-lg"> {/* animate-pulse */}
    <div className="flex items-center text-red-200">
        <ShieldAlert className="mr-3 flex-shrink-0" size={40} />
        <h4 className="font-black text-2xl tracking-wider uppercase">Nuclear Launch Requested</h4>
    </div>
    <div className="mt-4 font-mono text-center">
        <p className="text-red-300">Target Coordinates:</p>
        <p className="text-3xl font-bold text-red-200 my-2">{kwargs.target_coordinates}</p>
        <p className="text-xs text-white/60">Confirmation Code: <span className="text-red-400">{kwargs.confirmation_code}</span></p>
    </div>
  </div>
);


// --- Main Card Component ---

export const ApprovalCard = ({ toolCall, onApprove, onDeny, onSelect, isSelected }: ApprovalCardProps) => {
  const { id, tool_name, kwargs, renderer } = toolCall;

  const [updatedKwargs, setUpdatedKwargs] = useState(kwargs);

  const renderContent = () => {
    switch (renderer) {
      case "FileSystemRenderer":
        return <FileSystemRenderer kwargs={kwargs} />;
      case "NukeLaunchRenderer":
        return <NukeLaunchRenderer kwargs={kwargs} />;
      case "EditableRenderer":
        return <EditableRenderer kwargs={updatedKwargs} onChange={setUpdatedKwargs} />;
      default:
        return <DefaultRenderer kwargs={kwargs} />;
    }
  };


  const toolIcons: Record<string, React.ReactNode> = {
    send_email: <Send size={24} className="text-blue-300" />,
    delete_file: <Trash2 size={24} className="text-yellow-300" />,
    launch_nukes: <ShieldAlert size={24} className="text-red-300" />,
  };

  return (
    <div className="glass-card">
      <div className="card-content">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">{toolIcons[tool_name] || <Server size={24} className="text-gray-300" />}</div>
            <div>
              <h3 className="card-title">{tool_name}</h3>
              <p className="text-xs text-white/50 font-mono mt-1">{id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button onClick={() => onSelect(id)} className="text-white/60 hover:text-white transition-colors p-2">
              {isSelected ? <CheckSquare className="text-indigo-400" size={22} /> : <Square size={22} />}
            </button>
            <button
              onClick={() => onApprove(id, updatedKwargs)}
              className="glass-button glass-button--green"
            >
              <Check size={16} />
              <span>Approve</span>
            </button>
            <button
              onClick={() => onDeny(id)}
              className="glass-button glass-button--red"
            >
              <Trash2 size={16} />
              <span>Deny</span>
            </button>
          </div>
        </div>
        <div className="mt-4">
            {renderContent()}
        </div>
      </div>
    </div>
  );
};
