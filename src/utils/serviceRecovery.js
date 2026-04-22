// src/utils/serviceRecovery.js
//
// 服务自动恢复管理器
// - 监控服务状态
// - 自动恢复策略
// - 服务中断通知

import { networkMonitor } from './voiceAPI';

// 恢复策略配置
const RECOVERY_CONFIG = {
  maxAttempts: 5,
  baseDelay: 1000,    // 1 second
  maxDelay: 30000,    // 30 seconds
  healthCheckInterval: 10000, // 10 seconds
};

/**
 * 服务恢复管理器
 */
class ServiceRecoveryManager {
  constructor() {
    this.status = {
      whisper: 'unknown',
      kokoro: 'unknown',
      overall: 'unknown'
    };
    this.listeners = [];
    this.recoveryAttempts = {
      whisper: 0,
      kokoro: 0
    };
    this.recoveryTimers = {
      whisper: null,
      kokoro: null
    };
    this.healthCheckTimer = null;
    this.isRecovering = false;
  }

  /**
   * 开始监控
   */
  start() {
    // 立即检查状态
    this.checkHealth();

    // 定期检查
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth();
    }, RECOVERY_CONFIG.healthCheckInterval);

    // 监听网络状态变化
    networkMonitor.addListener((status) => {
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
  stop() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // 清除恢复定时器
    Object.keys(this.recoveryTimers).forEach(key => {
      if (this.recoveryTimers[key]) {
        clearTimeout(this.recoveryTimers[key]);
        this.recoveryTimers[key] = null;
      }
    });

    networkMonitor.stop();
  }

  /**
   * 检查服务健康状态
   */
  async checkHealth() {
    try {
      const response = await fetch('/api/voice/status');
      const data = await response.json();

      const prevStatus = { ...this.status };

      this.status = {
        whisper: data.whisper === 'running' ? 'up' : 'down',
        kokoro: data.kokoro === 'running' ? 'up' : 'down',
        overall: data.ready ? 'up' : 'partial'
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

    } catch (error) {
      console.error('[ServiceRecovery] Health check failed:', error);
      this.handleServiceDown('network');
    }
  }

  /**
   * 处理服务宕机
   */
  handleServiceDown(service) {
    console.log(`[ServiceRecovery] ${service} 服务宕机`);

    // 重置恢复计数（如果是新宕机）
    if (this.recoveryAttempts[service] === 0) {
      this.notifyListeners('serviceDown', { service, status: this.status });
    }

    // 开始自动恢复
    if (!this.isRecovering && this.recoveryAttempts[service] < RECOVERY_CONFIG.maxAttempts) {
      this.scheduleRecovery(service);
    }
  }

  /**
   * 处理服务恢复
   */
  handleServiceUp(service) {
    console.log(`[ServiceRecovery] ${service} 服务恢复`);

    // 清除恢复定时器
    if (this.recoveryTimers[service]) {
      clearTimeout(this.recoveryTimers[service]);
      this.recoveryTimers[service] = null;
    }

    // 重置恢复计数
    this.recoveryAttempts[service] = 0;
    this.isRecovering = false;

    // 通知恢复
    this.notifyListeners('serviceUp', { service, status: this.status });
  }

  /**
   * 安排恢复尝试
   */
  scheduleRecovery(service) {
    if (!this.recoveryAttempts[service]) {
      this.recoveryAttempts[service] = 0;
    }

    const attempt = this.recoveryAttempts[service] + 1;

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

    console.log(`[ServiceRecovery] ${service} 恢复尝试 ${attempt}/${RECOVERY_CONFIG.maxAttempts}, 等待 ${delay}ms`);

    this.isRecovering = true;
    this.recoveryTimers[service] = setTimeout(() => {
      this.attemptRecovery(service);
    }, delay);
  }

  /**
   * 尝试恢复服务
   */
  async attemptRecovery(service) {
    this.recoveryAttempts[service]++;
    this.isRecovering = false;

    // 检查健康状态（如果恢复则停止）
    await this.checkHealth();

    if (this.status[service] === 'up') {
      console.log(`[ServiceRecovery] ${service} 已恢复`);
      return;
    }

    // 如果仍然宕机，继续尝试
    this.notifyListeners('recoveryAttempt', {
      service,
      attempt: this.recoveryAttempts[service],
      maxAttempts: RECOVERY_CONFIG.maxAttempts
    });

    this.scheduleRecovery(service);
  }

  /**
   * 添加监听器
   */
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 通知监听器
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[ServiceRecovery] Listener error:', error);
      }
    });
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return this.status;
  }

  /**
   * 手动触发恢复
   */
  async forceRecover(service) {
    this.recoveryAttempts[service] = 0;
    await this.attemptRecovery(service);
  }
}

// 全局恢复管理器实例
const serviceRecovery = new ServiceRecoveryManager();

export {
  ServiceRecoveryManager,
  serviceRecovery,
  RECOVERY_CONFIG
};

export default serviceRecovery;