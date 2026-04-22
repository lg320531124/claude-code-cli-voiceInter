// src/components/LanguageSelector.jsx
//
// 语言选择组件
// - 语言下拉选择
// - 自动检测选项
// - 当前语言显示
// - 集成语言检测

import React, { useState, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  saveLanguageSetting,
  loadLanguageSetting,
  getLanguageName
} from '../utils/languageDetection';

function LanguageSelector({
  currentLanguage,
  onLanguageChange,
  showAutoDetect = true,
  compact = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(currentLanguage || 'auto');

  // 加载保存的语言设置
  useEffect(() => {
    if (!currentLanguage) {
      const saved = loadLanguageSetting();
      setSelected(saved.id);
      onLanguageChange?.(saved.id);
    }
  }, [currentLanguage, onLanguageChange]);

  // 处理语言选择
  const handleSelect = (languageId) => {
    setSelected(languageId);
    saveLanguageSetting(languageId);
    onLanguageChange?.(languageId);
    setIsOpen(false);
  };

  // 获取当前语言显示
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.id === selected) || DEFAULT_LANGUAGE;

  // 紧凑模式 - 下拉菜单
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 transition"
        >
          <Globe className="w-4 h-4" />
          <span>{currentLang.name}</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 z-10 min-w-[150px]">
            {SUPPORTED_LANGUAGES
              .filter(l => showAutoDetect || l.id !== 'auto')
              .map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => handleSelect(lang.id)}
                  className={`w-full px-3 py-2 text-sm text-left transition ${
                    selected === lang.id
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
          </div>
        )}
      </div>
    );
  }

  // 完整模式 - 标签 + 选择
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-300">语言</span>
        <span className="text-xs text-purple-400">
          {currentLang.name}
        </span>
      </div>

      {/* 语言选择网格 */}
      <div className="grid grid-cols-3 gap-1">
        {SUPPORTED_LANGUAGES
          .filter(l => showAutoDetect || l.id !== 'auto')
          .slice(0, 9) // 只显示前9个
          .map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleSelect(lang.id)}
              className={`py-2 px-2 rounded-lg text-xs transition-all ${
                selected === lang.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {lang.name.length > 8 ? lang.name.slice(0, 6) + '..' : lang.name}
            </button>
          ))}
      </div>

      {/* 更多语言下拉 */}
      {SUPPORTED_LANGUAGES.length > 9 && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full py-1 px-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 transition flex items-center justify-center gap-1"
        >
          <ChevronDown className="w-3 h-3" />
          {isOpen ? '收起' : '更多语言'}
        </button>
      )}

      {isOpen && SUPPORTED_LANGUAGES.length > 9 && (
        <div className="grid grid-cols-3 gap-1">
          {SUPPORTED_LANGUAGES
            .filter(l => showAutoDetect || l.id !== 'auto')
            .slice(9)
            .map((lang) => (
              <button
                key={lang.id}
                onClick={() => handleSelect(lang.id)}
                className={`py-2 px-2 rounded-lg text-xs transition-all ${
                  selected === lang.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {lang.name.length > 8 ? lang.name.slice(0, 6) + '..' : lang.name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;