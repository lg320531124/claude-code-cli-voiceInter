// src/components/ErrorToast.jsx

import React, { useState, useEffect } from 'react';
import { getErrorInfo } from '../utils/voiceErrors';

function ErrorToast({ errorType, category = 'STT', onClose, autoCloseDelay = 5000 }) {
  const [visible, setVisible] = useState(true);
  const errorInfo = getErrorInfo(errorType, category);

  useEffect(() => {
    if (!autoCloseDelay) return;

    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [autoCloseDelay, onClose]);

  if (!visible) return null;

  const handleRetry = () => {
    if (errorInfo.autoRetry) {
      setVisible(false);
      onClose?.(true); // 传递 true 表示需要重试
    }
  };

  // 根据错误类型选择颜色
  const isError = !errorInfo.autoRetry;
  const bgColor = isError ? 'bg-red-500/90' : 'bg-yellow-500/90';

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm`}>
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="flex-shrink-0">
          {isError ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1">
          <h4 className="font-medium">{errorInfo.title}</h4>
          <p className="text-sm opacity-90">{errorInfo.description}</p>
          <p className="text-xs mt-1 opacity-75">{errorInfo.action}</p>
        </div>

        {/* 按钮 */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {errorInfo.autoRetry && (
            <button
              onClick={handleRetry}
              className="text-sm px-2 py-1 bg-white/20 rounded hover:bg-white/30 transition"
            >
              重试
            </button>
          )}
          <button
            onClick={() => { setVisible(false); onClose?.(); }}
            className="text-sm px-2 py-1 bg-white/20 rounded hover:bg-white/30 transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorToast;