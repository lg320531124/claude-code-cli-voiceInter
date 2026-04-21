import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

/**
 * Voice Button Component - Modern Design
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
      return 'bg-muted text-muted-foreground cursor-not-allowed opacity-50';
    }
    if (isListening) {
      return 'bg-voice-active text-white voice-recording';
    }
    if (isSpeaking) {
      return 'bg-primary text-primary-foreground';
    }
    return 'bg-voice-ready text-white hover:bg-voice-ready/80';
  };

  // Get icon based on state
  const getIcon = () => {
    if (isSpeaking) {
      return <Volume2 className="w-5 h-5" />;
    }
    if (isListening) {
      return <Mic className="w-5 h-5" />;
    }
    return <Mic className="w-5 h-5" />;
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
      className={`h-[44px] w-[44px] rounded-xl flex items-center justify-center transition-smooth ${getButtonStyle()}`}
      aria-label={getTooltip()}
    >
      {getIcon()}
    </button>
  );
}

export default VoiceButton;