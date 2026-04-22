// src/components/ConversationReplay.jsx
//
// 对话历史回放组件
// - 播放/暂停控制
// - 进度条显示
// - 播放速度控制
// - 逐条消息朗读
// - 从指定位置开始回放

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, X, RotateCcw, Gauge } from 'lucide-react';
import { useHybridTTS } from '../hooks/useHybridTTS';

function ConversationReplay({
  messages,
  isOpen,
  onClose,
  defaultSpeed = 1.0
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(defaultSpeed);
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(null);

  const playbackRef = useRef(null);
  const filteredMessagesRef = useRef([]);

  // 混合 TTS
  const hybridTTS = useHybridTTS({
    voice: 'af_sky',
    speed: playbackSpeed,
    language: 'zh-CN',
    preferKokoro: true
  });

  // 过滤有效消息 (排除错误消息)
  useEffect(() => {
    filteredMessagesRef.current = messages.filter(m =>
      m.role === 'user' || m.role === 'assistant'
    );
  }, [messages]);

  // 获取过滤后的消息
  const getFilteredMessages = useCallback(() => {
    return filteredMessagesRef.current;
  }, []);

  // 播放当前消息
  const playCurrentMessage = useCallback(async () => {
    const filtered = getFilteredMessages();
    if (currentIndex >= filtered.length) {
      // 播放完成
      setIsPlaying(false);
      setCurrentIndex(0);
      setProgress(0);
      setCurrentMessage(null);
      return;
    }

    const msg = filtered[currentIndex];
    setCurrentMessage(msg);

    // 格式化消息内容
    const content = msg.role === 'user'
      ? `用户说：${msg.content}`
      : `Claude 回复：${msg.content}`;

    // 使用 TTS 朗读
    hybridTTS.speak(content);

    // 更新进度
    setProgress((currentIndex / filtered.length) * 100);
  }, [currentIndex, getFilteredMessages, hybridTTS]);

  // 播放/暂停
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      // 暂停
      hybridTTS.stop();
      setIsPlaying(false);
    } else {
      // 播放
      setIsPlaying(true);
      playCurrentMessage();
    }
  }, [isPlaying, hybridTTS, playCurrentMessage]);

  // 监听 TTS 完成事件
  useEffect(() => {
    if (!isPlaying) return;

    // 监听 speech end
    const checkSpeechEnd = () => {
      if (!hybridTTS.isSpeaking && isPlaying) {
        // 当前消息朗读完成，播放下一条
        const filtered = getFilteredMessages();
        if (currentIndex < filtered.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // 播放完成
          setIsPlaying(false);
          setCurrentIndex(0);
          setProgress(0);
          setCurrentMessage(null);
        }
      }
    };

    const timer = setInterval(checkSpeechEnd, 500);
    return () => clearInterval(timer);
  }, [isPlaying, hybridTTS.isSpeaking, currentIndex, getFilteredMessages]);

  // 播放当前消息当 currentIndex 改变时
  useEffect(() => {
    if (isPlaying) {
      playCurrentMessage();
    }
  }, [currentIndex]);

  // 跳转到指定位置
  const handleSeek = useCallback((e) => {
    const filtered = getFilteredMessages();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const newIndex = Math.floor(percent * filtered.length);

    hybridTTS.stop();
    setCurrentIndex(Math.max(0, Math.min(newIndex, filtered.length - 1)));
    setProgress(percent * 100);
  }, [getFilteredMessages, hybridTTS]);

  // 上一条
  const handlePrevious = useCallback(() => {
    const filtered = getFilteredMessages();
    if (currentIndex > 0) {
      hybridTTS.stop();
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, getFilteredMessages, hybridTTS]);

  // 下一条
  const handleNext = useCallback(() => {
    const filtered = getFilteredMessages();
    if (currentIndex < filtered.length - 1) {
      hybridTTS.stop();
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, getFilteredMessages, hybridTTS]);

  // 重置播放
  const handleReset = useCallback(() => {
    hybridTTS.stop();
    setIsPlaying(false);
    setCurrentIndex(0);
    setProgress(0);
    setCurrentMessage(null);
  }, [hybridTTS]);

  // 关闭面板
  const handleClose = useCallback(() => {
    hybridTTS.stop();
    setIsPlaying(false);
    onClose?.();
  }, [hybridTTS, onClose]);

  // 速度调节
  const handleSpeedChange = useCallback((newSpeed) => {
    setPlaybackSpeed(newSpeed);
  }, []);

  // 速度选项
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // 格式化时间
  const formatMessageTime = (msg) => {
    if (!msg.timestamp) return '';
    const date = new Date(msg.timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 不显示时返回 null
  if (!isOpen) return null;

  const filtered = getFilteredMessages();
  const totalMessages = filtered.length;
  const hasMessages = totalMessages > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-gray-700 shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-medium text-white">对话回放</h2>
            <span className="text-sm text-gray-400">
              {totalMessages} 条消息
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 当前播放消息 */}
        {currentMessage && (
          <div className={`p-4 rounded-xl mb-4 ${
            currentMessage.role === 'user'
              ? 'bg-blue-500/20 border border-blue-500/30'
              : 'bg-purple-500/20 border border-purple-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-medium ${
                currentMessage.role === 'user' ? 'text-blue-300' : 'text-purple-300'
              }`}>
                {currentMessage.role === 'user' ? '👤 用户' : '🤖 Claude'}
              </span>
              {currentMessage.timestamp && (
                <span className="text-xs text-gray-500">
                  {formatMessageTime(currentMessage)}
                </span>
              )}
              {currentIndex + 1}/{totalMessages}
            </div>
            <p className="text-white/80 text-sm leading-relaxed max-h-24 overflow-y-auto">
              {currentMessage.content}
            </p>
          </div>
        )}

        {/* 进度条 */}
        {hasMessages && (
          <div className="mb-4">
            <div
              className="w-full h-3 bg-gray-700 rounded-full cursor-pointer overflow-hidden"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>消息 {currentIndex + 1}</span>
              <span>共 {totalMessages} 条</span>
            </div>
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* 重置 */}
          <button
            onClick={handleReset}
            disabled={!hasMessages}
            className="p-3 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="重置播放"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* 上一条 */}
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0 || !hasMessages}
            className="p-3 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="上一条消息"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* 播放/暂停 */}
          <button
            onClick={handlePlayPause}
            disabled={!hasMessages}
            className={`p-4 rounded-xl transition-all duration-200 ${
              hasMessages
                ? isPlaying
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
                  : 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
          </button>

          {/* 下一条 */}
          <button
            onClick={handleNext}
            disabled={currentIndex >= totalMessages - 1 || !hasMessages}
            className="p-3 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="下一条消息"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          {/* 速度控制 */}
          <div className="relative">
            <button
              className="p-3 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition flex items-center gap-1"
              title="播放速度"
            >
              <Gauge className="w-5 h-5" />
              <span className="text-xs">{playbackSpeed}x</span>
            </button>

            {/* 速度选择下拉 */}
            <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-2 min-w-[80px]">
              {speedOptions.map(speed => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`w-full px-2 py-1 text-sm rounded text-left transition ${
                    playbackSpeed === speed
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 状态提示 */}
        {!hasMessages && (
          <div className="text-center text-gray-500 py-4">
            暂无可回放的对话消息
          </div>
        )}

        {hasMessages && !isPlaying && currentIndex === 0 && (
          <div className="text-center text-gray-400 text-sm">
            点击播放按钮开始回放对话历史
          </div>
        )}

        {/* 提示 */}
        <p className="text-xs text-gray-500 text-center mt-2">
          💡 提示：点击进度条可跳转到指定消息，调节速度可加快或减慢朗读
        </p>
      </div>
    </div>
  );
}

// 回放控制按钮 (用于触发打开回放面板)
export function ReplayControl({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 group"
      title="🔄 对话回放 - 朗读历史对话记录"
    >
      <Play className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
    </button>
  );
}

export default ConversationReplay;