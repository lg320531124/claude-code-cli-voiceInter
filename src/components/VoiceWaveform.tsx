/**
 * VoiceWaveform - Animated waveform visualization for voice activity
 */
import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  volumeLevel: number;
  speakerType: 'user' | 'assistant' | null;
}

export default function VoiceWaveform({ isActive, volumeLevel, speakerType }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barCount = 40;
    const barWidth = width / barCount - 2;

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Draw flat line when not active
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < barCount; i++) {
          ctx.fillRect(i * (barWidth + 2), height / 2 - 2, barWidth, 4);
        }
        return;
      }

      // Color based on speaker
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      if (speakerType === 'user') {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
        gradient.addColorStop(1, 'rgba(249, 115, 22, 0.8)');
      } else {
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.8)');
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0.8)');
      }

      ctx.fillStyle = gradient;

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + 2);
        const volumeFactor = volumeLevel / 100;
        const waveHeight = Math.sin(phase + i * 0.3) * 0.5 + 0.5;
        const barHeight = waveHeight * height * 0.8 * volumeFactor;

        ctx.fillRect(x, height / 2 - barHeight / 2, barWidth, barHeight);
      }

      phase += 0.1;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, volumeLevel, speakerType]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      className="w-full h-[60px] rounded-lg bg-white/5"
    />
  );
}