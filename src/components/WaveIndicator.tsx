/**
 * WaveIndicator - Animated wave indicator for response status
 */
import React from 'react';

interface WaveIndicatorProps {
  active: boolean;
  onClick?: () => void;
}

export default function WaveIndicator({ active, onClick }: WaveIndicatorProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all duration-300 ${
        active
          ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/40 hover:from-red-500/30 hover:to-orange-500/30 hover:border-red-400/40 cursor-pointer'
          : 'bg-white/5 border border-white/10 opacity-50'
      }`}
      title={active ? '⏹️ 点击停止响应' : '等待响应...'}
      aria-label="Stop response"
    >
      <div className="flex items-center gap-[3px] h-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all ${
              active
                ? 'bg-gradient-to-t from-purple-400 to-pink-400'
                : 'bg-white/30'
            }`}
            style={{
              height: active ? '100%' : '40%',
              animation: active
                ? `wave 1s ease-in-out infinite ${i * 0.1}s`
                : 'none',
            }}
          />
        ))}
      </div>
      <span className={`ml-2 text-sm font-medium ${
        active ? 'text-purple-300' : 'text-white/40'
      }`}>
        {active ? '回答中...' : '就绪'}
      </span>
    </button>
  );
}