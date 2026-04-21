import React from 'react';

/**
 * Voice Button Component
 *
 * A button that toggles voice recognition.
 * Shows different states: ready, recording, disabled.
 */
function VoiceButton({
  isListening,
  isSpeaking,
  isSupported,
  onClick,
  disabled
}) {
  // Determine button state
  const isActive = isListening || isSpeaking;
  const isDisabled = disabled || !isSupported;

  // Get button class
  const buttonClass = `voice-button ${isActive ? 'recording' : ''} ${isDisabled ? 'disabled' : ''}`;

  // Get icon based on state
  const getIcon = () => {
    if (isListening) {
      return '🎤'; // Recording
    }
    if (isSpeaking) {
      return '🔊'; // Speaking
    }
    return '🎙️'; // Ready
  };

  // Get title/tooltip
  const getTitle = () => {
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
      className={buttonClass}
      onClick={onClick}
      disabled={isDisabled}
      title={getTitle()}
      aria-label={getTitle()}
    >
      <span className="voice-icon">{getIcon()}</span>
    </button>
  );
}

export default VoiceButton;