// src/components/TTSSettings.jsx
//
// TTS 定制设置面板
// - 语音速度调节
// - 声音选择
// - 音调调节 (可选)

import React, { useState, useEffect } from 'react';
import { Speaker, Volume2, Gauge, User } from 'lucide-react';

function TTSSettings({
  speed,
  voice,
  voices,
  onSpeedChange,
  onVoiceChange,
  ttsMode,
  kokoroReady,
  browserReady,
  onTestSpeak
}) {
  // Kokoro 预设声音
  const kokoroVoices = [
    { id: 'af_sky', name: 'Sky (女声)', lang: '多语言' },
    { id: 'af_bella', name: 'Bella (女声)', lang: '英语' },
    { id: 'af_sarah', name: 'Sarah (女声)', lang: '英语' },
    { id: 'am_adam', name: 'Adam (男声)', lang: '英语' },
    { id: 'bf_emma', name: 'Emma (女声)', lang: '英语' },
    { id: 'bm_george', name: 'George (男声)', lang: '英语' },
  ];

  // 速度预设
  const speedPresets = [
    { value: 0.5, label: '慢速', desc: '适合学习' },
    { value: 0.75, label: '较慢', desc: '清晰朗读' },
    { value: 1.0, label: '正常', desc: '默认速度' },
    { value: 1.25, label: '较快', desc: '高效阅读' },
    { value: 1.5, label: '快速', desc: '快速浏览' },
    { value: 2.0, label: '极快', desc: '超快朗读' },
  ];

  return (
    <div className="space-y-4">
      {/* TTS 模式显示 */}
      <div className="flex items-center gap-2 text-sm">
        <Speaker className="w-4 h-4 text-gray-400" />
        <span className="text-gray-300">当前模式:</span>
        <span className={`px-2 py-1 rounded ${
          ttsMode === 'kokoro' ? 'bg-purple-500/20 text-purple-400' :
          ttsMode === 'browser' ? 'bg-blue-500/20 text-blue-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {ttsMode === 'kokoro' ? 'Kokoro' : ttsMode === 'browser' ? '浏览器' : '检测中'}
        </span>
      </div>

      {/* 速度调节 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">语音速度</span>
          <span className="text-xs text-purple-400 font-medium">
            {speed}x
          </span>
        </div>

        {/* 速度滑块 */}
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.25"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />

        {/* 速度预设按钮 */}
        <div className="flex gap-1">
          {speedPresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onSpeedChange(preset.value)}
              className={`flex-1 py-1 px-2 rounded text-xs transition-all ${
                speed === preset.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 声音选择 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">声音选择</span>
        </div>

        {/* Kokoro 声音 */}
        {ttsMode === 'kokoro' && kokoroReady && (
          <div className="grid grid-cols-2 gap-2">
            {kokoroVoices.map((v) => (
              <button
                key={v.id}
                onClick={() => onVoiceChange(v.id)}
                className={`py-2 px-3 rounded-lg text-xs transition-all ${
                  voice === v.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        )}

        {/* 浏览器声音 */}
        {ttsMode === 'browser' && browserReady && voices && voices.length > 0 && (
          <select
            value={voice}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="w-full py-2 px-3 rounded-lg bg-gray-700 text-gray-300 text-sm border border-gray-600 focus:border-purple-500 focus:outline-none"
          >
            <option value="">选择声音</option>
            {voices
              .filter(v => v.lang.includes('zh') || v.lang.includes('en'))
              .map((v, i) => (
                <option key={i} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
          </select>
        )}

        {/* 无可用声音 */}
        {(!kokoroReady && !browserReady) && (
          <div className="text-xs text-gray-500 text-center py-2">
            暂无可用声音
          </div>
        )}
      </div>

      {/* 测试按钮 */}
      <button
        onClick={() => onTestSpeak?.('这是一段测试文本，用于验证语音设置效果。')}
        disabled={!kokoroReady && !browserReady}
        className={`w-full py-2 px-4 rounded-lg text-sm border transition-all ${
          (kokoroReady || browserReady)
            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30'
            : 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed'
        }`}
      >
        <Volume2 className="w-4 h-4 inline mr-2" />
        测试语音
      </button>
    </div>
  );
}

export default TTSSettings;