import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

/**
 * Voice Button Component - Apple Style
 */
function VoiceButton({
  isListening,
  isSpeaking,
  isSupported,
  onClick,
  disabled
}) {
  const isActive = isListening || isSpeaking;
  const isDisabled = disabled || !isSupported;

  // Get button styling based on state
  const getButtonStyle = () => {
    if (isDisabled) {
      return 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed';
    }
    if (isListening) {
      return 'bg-gradient-to-r from-red-500 to-orange-500 border-red-400/50 text-white shadow-lg shadow-red-500/30 animate-pulse';
    }
    if (isSpeaking) {
      return 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400/50 text-white shadow-lg shadow-purple-500/30';
    }
    return 'bg-white/10 backdrop-blur-xl border-white/10 text-white/70 hover:bg-white/20 hover:text-white hover:border-white/20';
  };

  // Get icon based on state
  const getIcon = () => {
    if (!isSupported) {
      return <MicOff className="w-6 h-6" />;
    }
    if (isSpeaking) {
      return <Volume2 className="w-6 h-6 animate-pulse" />;
    }
    if (isListening) {
      return <Mic className="w-6 h-6" />;
    }
    return <Mic className="w-6 h-6" />;
  };

  // Get tooltip
  const getTooltip = () => {
    if (!isSupported) {
      return 'Voice not supported in this browser';
    }
    if (isListening) {
      return 'Listening... Click to stop';
    }
    if (isSpeaking) {
      return 'Speaking... Click to stop';
    }
    return 'Click to start voice input';
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={getTooltip()}
      className={`h-[56px] w-[56px] rounded-2xl flex items-center justify-center transition-all duration-200 border ${getButtonStyle()} group`}
      aria-label={getTooltip()}
    >
      {getIcon()}
    </button>
  );
}

export default VoiceButton;