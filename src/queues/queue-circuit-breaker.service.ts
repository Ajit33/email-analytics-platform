import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CircuitState =
  | 'CLOSED'
  | 'OPEN'
  | 'HALF_OPEN';

@Injectable()
export class QueueCircuitBreakerService {
  private readonly logger = new Logger(
    QueueCircuitBreakerService.name,
  );

  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenSuccessThreshold: number;

  constructor(
    private readonly config: ConfigService,
  ) {
    this.failureThreshold =
      this.config.get<number>(
        'CB_FAILURE_THRESHOLD',
        3,
      );
    this.resetTimeout = this.config.get<number>(
      'CB_RESET_TIMEOUT_MS',
      10000,
    );
    this.halfOpenSuccessThreshold =
      this.config.get<number>(
        'CB_HALF_OPEN_SUCCESS_THRESHOLD',
        2,
      );
  }

  async execute<T>(
    job: () => Promise<T>,
    fallback?: () => T,
  ): Promise<T | null> {
    if (this.isOpen()) {
      this.logger.warn(
        `Circuit OPEN — job rejected immediately`,
      );
      return fallback ? fallback() : null;
    }

    try {
      const result = await job();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err as Error);
      return fallback ? fallback() : null;
    }
  }

  getState(): CircuitState {
    this.transitionIfNeeded();
    return this.state;
  }

  getMetrics() {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
        ? new Date(
            this.lastFailureTime,
          ).toISOString()
        : null,
    };
  }

  // ── Private ───────────────────────────────────────────────────

  private isOpen(): boolean {
    this.transitionIfNeeded();
    return this.state === 'OPEN';
  }

  private transitionIfNeeded(): void {
    if (
      this.state === 'OPEN' &&
      Date.now() - this.lastFailureTime >
        this.resetTimeout
    ) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      this.logger.log(
        'Circuit HALF_OPEN — testing Redis connectivity',
      );
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (
        this.successCount >=
        this.halfOpenSuccessThreshold
      ) {
        this.reset();
      }
      return;
    }
    // reset failure count on success in CLOSED state
    this.failureCount = 0;
  }

  private onFailure(err: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    this.logger.error(
      `Queue failure [${this.state}] count=${this.failureCount}: ${err.message}`,
    );

    if (
      this.state === 'HALF_OPEN' ||
      this.failureCount >= this.failureThreshold
    ) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = 'OPEN';
    this.logger.warn(
      `Circuit OPEN — Redis unavailable after ${this.failureCount} failures`,
    );
  }

  private reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.logger.log(
      'Circuit CLOSED — Redis recovered',
    );
  }
}
