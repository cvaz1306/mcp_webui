'use client';
import React, { useState } from 'react';
const FrostedGlassToggle = ({ 
  isOn = false, 
  onToggle = () => {}, 
  size = 'md',
  disabled = false,
  label = ''
}) => {
  const [internalState, setInternalState] = useState(isOn);
  
  const handleToggle = () => {
    if (disabled) return;
    const newState = !internalState;
    setInternalState(newState);
    onToggle(newState);
  };

  const sizeClasses = {
    sm: {
      track: 'w-10 h-6',
      thumb: 'w-4 h-4',
      translate: 'translate-x-4'
    },
    md: {
      track: 'w-14 h-8',
      thumb: 'w-6 h-6',
      translate: 'translate-x-6'
    },
    lg: {
      track: 'w-18 h-10',
      thumb: 'w-8 h-8',
      translate: 'translate-x-8'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className="flex items-center gap-3">
      {label && (
        <label className="text-sm font-medium text-gray-700 select-none">
          {label}
        </label>
      )}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`
          relative inline-flex items-center rounded-full p-1 transition-all duration-300 ease-in-out
          ${currentSize.track}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
          ${internalState 
            ? 'bg-gradient-to-r from-blue-400/30 to-purple-500/30 shadow-lg shadow-blue-500/25' 
            : 'bg-white/20 shadow-lg shadow-gray-500/10'
          }
          backdrop-blur-md border border-white/30
          focus:outline-none focus:ring-blue-300/50 focus:ring-offset-2 focus:ring-offset-transparent
          active:scale-95
        `}
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Animated background glow */}
        <div 
          className={`
            absolute inset-0 rounded-full transition-all duration-500 ease-out
            ${internalState 
              ? 'bg-gradient-to-r from-blue-400/20 to-purple-500/20 opacity-100' 
              : 'bg-gray-200/10 opacity-0'
            }
          `}
        />
        
        {/* Toggle thumb */}
        <div
          className={`
            relative rounded-full transition-all duration-300 ease-out
            ${currentSize.thumb}
            ${internalState ? currentSize.translate : 'translate-x-0'}
            ${internalState 
              ? 'bg-gradient-to-br from-white via-blue-50 to-purple-50 shadow-lg shadow-blue-500/30' 
              : 'bg-gradient-to-br from-white to-gray-50 shadow-md shadow-gray-500/20'
            }
            backdrop-blur-sm border border-white/60
          `}
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {/* Inner glow effect */}
          <div 
            className={`
              absolute inset-0 rounded-full transition-all duration-300
              ${internalState 
                ? 'bg-gradient-to-br from-blue-200/30 to-purple-200/30' 
                : 'bg-gradient-to-br from-white/20 to-gray-100/20'
              }
            `}
          />
          
          {/* Shine effect */}
          <div 
            className={`
              absolute top-0.5 left-0.5 w-1/2 h-1/2 rounded-full transition-all duration-300
              ${internalState 
                ? 'bg-gradient-to-br from-white/60 to-transparent' 
                : 'bg-gradient-to-br from-white/40 to-transparent'
              }
            `}
          />
        </div>

        {/* Track indicators */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
          <div 
            className={`
              w-1 h-1 rounded-full transition-all duration-300
              ${internalState ? 'bg-white/0' : 'bg-gray-400/60'}
            `}
          />
          <div 
            className={`
              w-1 h-1 rounded-full transition-all duration-300
              ${internalState ? 'bg-white/80' : 'bg-gray-400/0'}
            `}
          />
        </div>
      </button>
    </div>
  );
};

// Demo component
const Demo = () => {
  const [toggle1, setToggle1] = useState(false);
  const [toggle2, setToggle2] = useState(true);
  const [toggle3, setToggle3] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Frosted Glass Toggle Switches
        </h1>
        
        <div className="space-y-8">
          {/* Different sizes */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-6">Different Sizes</h2>
            <div className="space-y-4">
              <FrostedGlassToggle 
                size="sm" 
                label="Small" 
                isOn={toggle1} 
                onToggle={setToggle1}
              />
              <FrostedGlassToggle 
                size="md" 
                label="Medium" 
                isOn={toggle2} 
                onToggle={setToggle2}
              />
              <FrostedGlassToggle 
                size="lg" 
                label="Large" 
                isOn={toggle3} 
                onToggle={setToggle3}
              />
            </div>
          </div>

          {/* Settings panel example */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-6">Settings Panel</h2>
            <div className="space-y-4">
              <FrostedGlassToggle label="Dark Mode" isOn={true} />
              <FrostedGlassToggle label="Notifications" isOn={false} />
              <FrostedGlassToggle label="Auto-save" isOn={true} />
              <FrostedGlassToggle label="Sync Data" isOn={false} />
              <FrostedGlassToggle label="Offline Mode" isOn={false} disabled={true} />
            </div>
          </div>

          {/* Usage info */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Usage</h2>
            <div className="text-gray-300 space-y-2">
              <p><strong>Props:</strong></p>
              <ul className="ml-4 space-y-1 text-sm">
                <li>• <code>isOn</code> - Initial state (boolean)</li>
                <li>• <code>onToggle</code> - Callback function</li>
                <li>• <code>size</code> - 'sm', 'md', or 'lg'</li>
                <li>• <code>disabled</code> - Disable interaction</li>
                <li>• <code>label</code> - Optional label text</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo;