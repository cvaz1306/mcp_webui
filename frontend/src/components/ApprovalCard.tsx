import { FileWarning, Send, Trash2, ShieldAlert, Check, Square, CheckSquare, Server } from 'lucide-react';

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
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
}

// --- Custom Renderers ---

const DefaultRenderer = ({ kwargs }: { kwargs: Record<string, any> }) => (
  <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-xs whitespace-pre-wrap break-all">
    {JSON.stringify(kwargs, null, 2)}
  </pre>
);

const FileSystemRenderer = ({ kwargs }: { kwargs: Record<string, any> }) => (
  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 p-4 rounded-lg">
    <div className="flex items-center text-yellow-800 dark:text-yellow-300">
      <FileWarning className="mr-3" size={24} />
      <h4 className="font-bold text-lg">Filesystem Operation</h4>
    </div>
    <p className="mt-2 text-yellow-700 dark:text-yellow-400">
      This action will modify the filesystem.
    </p>
    <div className="mt-4 space-y-2 font-mono text-sm">
      <p><strong>Path:</strong> <span className="text-red-500">{kwargs.path}</span></p>
      <p><strong>Recursive:</strong> <span className={kwargs.recursive ? 'font-bold text-red-600' : 'text-gray-500'}>{String(kwargs.recursive)}</span></p>
    </div>
  </div>
);

const NukeLaunchRenderer = ({ kwargs }: { kwargs: Record<string, any> }) => (
  <div className="bg-red-100 dark:bg-red-900/30 border-2 border-dashed border-red-500 p-4 rounded-lg">
    <div className="flex items-center text-red-800 dark:text-red-200">
        <ShieldAlert className="mr-3 animate-pulse" size={40} />
        <h4 className="font-black text-2xl tracking-wider uppercase">Nuclear Launch Detected</h4>
    </div>
    <div className="mt-4 font-mono text-center">
        <p className="text-red-600 dark:text-red-300">Target Coordinates:</p>
        <p className="text-3xl font-bold text-red-700 dark:text-red-200 my-2">{kwargs.target_coordinates}</p>
        <p className="text-xs text-gray-500">Confirmation Code: <span className="text-red-400">{kwargs.confirmation_code}</span></p>
    </div>
  </div>
);


// --- Main Card Component ---

export const ApprovalCard = ({ toolCall, onApprove, onDeny, onSelect, isSelected }: ApprovalCardProps) => {
  const { id, tool_name, kwargs, renderer } = toolCall;

  const renderContent = () => {
    switch (renderer) {
      case "FileSystemRenderer": return <FileSystemRenderer kwargs={kwargs} />;
      case "NukeLaunchRenderer": return <NukeLaunchRenderer kwargs={kwargs} />;
      default: return <DefaultRenderer kwargs={kwargs} />;
    }
  };

  const toolIcons: Record<string, React.ReactNode> = {
    send_email: <Send size={20} className="text-blue-500" />,
    delete_file: <Trash2 size={20} className="text-yellow-500" />,
    launch_nukes: <ShieldAlert size={20} className="text-red-500" />,
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-indigo-500">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">{toolIcons[tool_name] || <Server size={20} />}</div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tool_name}</h3>
              <p className="text-xs text-gray-400 font-mono">{id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => onSelect(id)} className="text-gray-400 hover:text-indigo-600">
              {isSelected ? <CheckSquare className="text-indigo-600" /> : <Square />}
            </button>
            <button
              onClick={() => onApprove(id)}
              className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 text-sm font-semibold rounded-md hover:bg-green-600 transition-colors"
            >
              <Check size={16} />
              <span>Approve</span>
            </button>
            <button
              onClick={() => onDeny(id)}
              className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 text-sm font-semibold rounded-md hover:bg-red-600 transition-colors"
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
