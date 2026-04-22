// src/components/RealtimeSubtitles.jsx
//
// 实时字幕组件
// - 显示语音识别文本 (STT)
// - 显示语音合成文本 (TTS)
// - 悬浮动画效果
// - 位置可调整
// - 支持开关控制

import React, { useState, useEffect, useRef } from 'react';
import { Subtitles, X, Move, Settings } from 'lucide-react';

function RealtimeSubtitles({
  sttText,        // 语音识别文本
  ttsText,        // 语音合成文本
  isListening,    // 是否正在识别
  isSpeaking,     // 是否正在播放
  enabled = true, // 是否启用字幕
  onClose,        // 关闭回调
  position = 'bottom', // 位置: 'bottom' | 'top' | 'center'
  showInterim = true   // 显示中间结果
}) {
  const [currentText, setCurrentText] = useState('');
  const [speaker, setSpeaker] = useState(null); // 'user' | 'assistant'
  const [opacity, setOpacity] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [customPosition, setCustomPosition] = useState(null);

  const containerRef = useRef(null);

  // 更新字幕内容
  useEffect(() => {
    if (isListening && sttText) {
      setCurrentText(sttText);
      setSpeaker('user');
      setOpacity(1);
    } else if (isSpeaking && ttsText) {
      setCurrentText(ttsText);
      setSpeaker('assistant');
      setOpacity(1);
    } else if (!isListening && !isSpeaking) {
      // 延迟隐藏，让用户看到最后的内容
      setTimeout(() => {
        setOpacity(0);
        setTimeout(() => setCurrentText(''), 300);
      }, 500);
    }
  }, [sttText, ttsText, isListening, isSpeaking]);

  // 不启用或无内容时不显示
  if (!enabled || !currentText) {
    return null;
  }

  // 计算位置样式
  const getPositionStyle = () => {
    if (customPosition) {
      return {
        left: customPosition.x,
        top: customPosition.y,
        transform: 'none'
      };
    }

    switch (position) {
      case 'top':
        return {
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'center':
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
      case 'bottom':
      default:
        return {
          bottom: '120px',
          left: '50%',
          transform: 'translateX(-50%)'
        };
    }
  };

  // 拖拽处理
  const handleMouseDown = (e) => {
    if (e.target.closest('.subtitle-drag-handle')) {
      setIsDragging(true);
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setCustomPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // 说话者样式
  const speakerStyle = {
    user: {
      bgColor: 'bg-purple-500/90',
      textColor: 'text-white',
      borderColor: 'border-purple-400',
      iconColor: 'text-purple-200',
      label: '👤 用户'
    },
    assistant: {
      bgColor: 'bg-pink-500/90',
      textColor: 'text-white',
      borderColor: 'border-pink-400',
      iconColor: 'text-pink-200',
      label: '🤖 Claude'
    }
  };

  const style = speakerStyle[speaker] || speakerStyle.user;

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 transition-all duration-300 ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        ...getPositionStyle(),
        opacity
      }}
      onMouseDown={handleMouseDown}
    >
      <div className={`relative max-w-2xl min-w-[200px] rounded-xl ${style.bgColor} ${style.textColor} backdrop-blur-sm border-2 ${style.borderColor} shadow-xl overflow-hidden`}>
        {/* 拖拽手柄 */}
        <div className="subtitle-drag-handle absolute top-0 left-0 right-0 h-6 cursor-grab flex items-center justify-center opacity-50 hover:opacity-100 transition">
          <Move className="w-4 h-4" />
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-1 right-2 p-1 rounded opacity-50 hover:opacity-100 hover:bg-white/20 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 说话者标签 */}
        <div className="flex items-center gap-2 px-4 pt-6 pb-2">
          <Subtitles className={`w-4 h-4 ${style.iconColor}`} />
          <span className={`text-sm ${style.iconColor} font-medium`}>
            {style.label}
          </span>
          {isListening && (
            <span className="text-xs animate-pulse">正在听...</span>
          )}
          {isSpeaking && (
            <span className="text-xs animate-pulse">正在说...</span>
          )}
        </div>

        {/* 字幕内容 */}
        <div className="px-4 pb-4">
          <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap">
            {currentText}
          </p>
        </div>

        {/* 进度指示器 */}
        {(isListening || isSpeaking) && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 overflow-hidden">
            <div className={`h-full ${isListening ? 'bg-purple-300' : 'bg-pink-300'} animate-pulse`} style={{ width: '100%' }} />
          </div>
        )}
      </div>
    </div>
  );
}

// 字幕控制面板
export function SubtitlesControl({
  enabled,
  onToggle,
  position,
  onPositionChange,
  showInterim,
  onShowInterimChange
}) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="relative">
      {/* 主按钮 */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
          enabled
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            : 'bg-gray-700 text-gray-400 border border-gray-600'
        }`}
      >
        <Caption className="w-4 h-4" />
        <span className="text-sm">字幕</span>
        {enabled && <span className="text-xs bg-purple-500/30 px-1 rounded">ON</span>}
      </button>

      {/* 设置面板 */}
      {showSettings && (
        <div className="absolute top-full left-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-3 min-w-[180px] z-10">
          {/* 开关 */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">启用字幕</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="w-4 h-4 accent-purple-500"
            />
          </div>

          {/* 位置选择 */}
          <div className="mb-2">
            <span className="text-sm text-gray-400 mb-1 block">位置</span>
            <div className="flex gap-1">
              {['top', 'center', 'bottom'].map((pos) => (
                <button
                  key={pos}
                  onClick={() => onPositionChange(pos)}
                  className={`py-1 px-2 rounded text-xs ${
                    position === pos
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {pos === 'top' ? '顶部' : pos === 'center' ? '中间' : '底部'}
                </button>
              ))}
            </div>
          </div>

          {/* 显示中间结果 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">显示中间结果</span>
            <input
              type="checkbox"
              checked={showInterim}
              onChange={(e) => onShowInterimChange(e.target.checked)}
              className="w-4 h-4 accent-purple-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default RealtimeSubtitles;