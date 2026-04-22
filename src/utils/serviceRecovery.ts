// src/utils/serviceRecovery.ts
//
// 服务自动恢复管理器
// - 监控服务状态
// - 自动恢复策略
// - 服务中断通知

import { networkMonitor } from './voiceAPI';

// 恢复策略配置
const RECOVERY_CONFIG = {
  maxAttempts: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  healthCheckInterval: 10000, // 10 seconds
};

type ServiceStatus = 'unknown' | 'up' | 'down' | 'partial';
type ServiceName = 'whisper' | 'kokoro' | 'network';

interface StatusInfo {
  whisper: ServiceStatus;
  kokoro: ServiceStatus;
  overall: ServiceStatus;
}

interface RecoveryAttempts {
  whisper: number;
  kokoro: number;
}

interface RecoveryTimers {
  whisper: ReturnType<typeof setTimeout> | null;
  kokoro: ReturnType<typeof setTimeout> | null;
}

interface ServiceDownEvent {
  service: ServiceName;
  status: StatusInfo;
}

interface ServiceUpEvent {
  service: ServiceName;
  status: StatusInfo;
}

interface RecoveryAttemptEvent {
  service: ServiceName;
  attempt: number;
  maxAttempts: number;
}

interface RecoveryFailedEvent {
  service: ServiceName;
  attempts: number;
}

type RecoveryEvent =
  | 'statusChange'
  | 'serviceDown'
  | 'serviceUp'
  | 'recoveryAttempt'
  | 'recoveryFailed';

type RecoveryEventData =
  | StatusInfo
  | ServiceDownEvent
  | ServiceUpEvent
  | RecoveryAttemptEvent
  | RecoveryFailedEvent;

type RecoveryListener = (event: RecoveryEvent, data: RecoveryEventData) => void;

/**
 * 服务恢复管理器
 */
class ServiceRecoveryManager {
  private status: StatusInfo = {
    whisper: 'unknown',
    kokoro: 'unknown',
    overall: 'unknown',
  };

  private listeners: RecoveryListener[] = [];
  private recoveryAttempts: RecoveryAttempts = {
    whisper: 0,
    kokoro: 0,
  };

  private recoveryTimers: RecoveryTimers = {
    whisper: null,
    kokoro: null,
  };

  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private isRecovering: boolean = false;

  /**
   * 开始监控
   */
  start(): void {
    // 立即检查状态
    this.checkHealth();

    // 定期检查
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth();
    }, RECOVERY_CONFIG.healthCheckInterval);

    // 监听网络状态变化
    networkMonitor.addListener((status: string) => {
      if (status === 'offline') {
        this.handleServiceDown('network');
      } else if (status === 'good') {
        this.handleServiceUp('network');
      }
    });

    networkMonitor.start();
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // 清除恢复定时器
    Object.keys(this.recoveryTimers).forEach(key => {
      const serviceKey = key as keyof RecoveryTimers;
      if (this.recoveryTimers[serviceKey]) {
        clearTimeout(this.recoveryTimers[serviceKey]!);
        this.recoveryTimers[serviceKey] = null;
      }
    });

    networkMonitor.stop();
  }

  /**
   * 检查服务健康状态
   */
  async checkHealth(): Promise<void> {
    try {
      const response = await fetch('/api/voice/status');
      const data = await response.json();

      const prevStatus = { ...this.status };

      this.status = {
        whisper: data.whisper === 'running' ? 'up' : 'down',
        kokoro: data.kokoro === 'running' ? 'up' : 'down',
        overall: data.ready ? 'up' : 'partial',
      };

      // 检查状态变化
      if (prevStatus.whisper !== this.status.whisper) {
        if (this.status.whisper === 'down') {
          this.handleServiceDown('whisper');
        } else {
          this.handleServiceUp('whisper');
        }
      }

      if (prevStatus.kokoro !== this.status.kokoro) {
        if (this.status.kokoro === 'down') {
          this.handleServiceDown('kokoro');
        } else {
          this.handleServiceUp('kokoro');
        }
      }

      // 通知状态变化
      this.notifyListeners('statusChange', this.status);
    } catch (error: unknown) {
      console.error('[ServiceRecovery] Health check failed:', error);
      this.handleServiceDown('network');
    }
  }

  /**
   * 处理服务宕机
   */
  handleServiceDown(service: ServiceName): void {
    console.log(`[ServiceRecovery] ${service} 服务宕机`);

    // 重置恢复计数（如果是新宕机）
    const serviceKey = service as keyof RecoveryAttempts;
    if (serviceKey in this.recoveryAttempts && this.recoveryAttempts[serviceKey] === 0) {
      this.notifyListeners('serviceDown', { service, status: this.status });
    }

    // 开始自动恢复
    if (
      serviceKey in this.recoveryAttempts &&
      !this.isRecovering &&
      this.recoveryAttempts[serviceKey] < RECOVERY_CONFIG.maxAttempts
    ) {
      this.scheduleRecovery(service);
    }
  }

  /**
   * 处理服务恢复
   */
  handleServiceUp(service: ServiceName): void {
    console.log(`[ServiceRecovery] ${service} 服务恢复`);

    const serviceKey = service as keyof RecoveryTimers;

    // 清除恢复定时器
    if (serviceKey in this.recoveryTimers && this.recoveryTimers[serviceKey]) {
      clearTimeout(this.recoveryTimers[serviceKey]!);
      this.recoveryTimers[serviceKey] = null;
    }

    // 重置恢复计数
    if (serviceKey in this.recoveryAttempts) {
      this.recoveryAttempts[serviceKey] = 0;
    }
    this.isRecovering = false;

    // 通知恢复
    this.notifyListeners('serviceUp', { service, status: this.status });
  }

  /**
   * 安排恢复尝试
   */
  scheduleRecovery(service: ServiceName): void {
    const serviceKey = service as keyof RecoveryAttempts;

    if (!this.recoveryAttempts[serviceKey]) {
      this.recoveryAttempts[serviceKey] = 0;
    }

    const attempt = this.recoveryAttempts[serviceKey] + 1;

    if (attempt > RECOVERY_CONFIG.maxAttempts) {
      console.log(`[ServiceRecovery] ${service} 达到最大恢复尝试次数`);
      this.notifyListeners('recoveryFailed', { service, attempts: attempt });
      return;
    }

    // 指数退避
    const delay = Math.min(
      RECOVERY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
      RECOVERY_CONFIG.maxDelay
    );

    console.log(
      `[ServiceRecovery] ${service} 恢复尝试 ${attempt}/${RECOVERY_CONFIG.maxAttempts}, 等待 ${delay}ms`
    );

    this.isRecovering = true;
    const timerKey = service as keyof RecoveryTimers;
    this.recoveryTimers[timerKey] = setTimeout(() => {
      this.attemptRecovery(service);
    }, delay);
  }

  /**
   * 尝试恢复服务
   */
  async attemptRecovery(service: ServiceName): Promise<void> {
    const serviceKey = service as keyof RecoveryAttempts;
    this.recoveryAttempts[serviceKey]++;
    this.isRecovering = false;

    // 检查健康状态（如果恢复则停止）
    await this.checkHealth();

    const statusKey = service as keyof StatusInfo;
    if (statusKey in this.status && this.status[statusKey] === 'up') {
      console.log(`[ServiceRecovery] ${service} 已恢复`);
      return;
    }

    // 如果仍然宕机，继续尝试
    this.notifyListeners('recoveryAttempt', {
      service,
      attempt: serviceKey in this.recoveryAttempts ? this.recoveryAttempts[serviceKey] : 0,
      maxAttempts: RECOVERY_CONFIG.maxAttempts,
    });

    this.scheduleRecovery(service);
  }

  /**
   * 添加监听器
   */
  addListener(listener: RecoveryListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 通知监听器
   */
  private notifyListeners(event: RecoveryEvent, data: RecoveryEventData): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error: unknown) {
        console.error('[ServiceRecovery] Listener error:', error);
      }
    });
  }

  /**
   * 获取当前状态
   */
  getStatus(): StatusInfo {
    return this.status;
  }

  /**
   * 手动触发恢复
   */
  async forceRecover(service: ServiceName): Promise<void> {
    const serviceKey = service as keyof RecoveryAttempts;
    if (serviceKey in this.recoveryAttempts) {
      this.recoveryAttempts[serviceKey] = 0;
    }
    await this.attemptRecovery(service);
  }
}

// 全局恢复管理器实例
const serviceRecovery = new ServiceRecoveryManager();

export { ServiceRecoveryManager, serviceRecovery, RECOVERY_CONFIG };

export type {
  ServiceStatus,
  ServiceName,
  StatusInfo,
  RecoveryAttempts,
  RecoveryTimers,
  ServiceDownEvent,
  ServiceUpEvent,
  RecoveryAttemptEvent,
  RecoveryFailedEvent,
  RecoveryEvent,
  RecoveryEventData,
  RecoveryListener,
};

export default serviceRecovery;