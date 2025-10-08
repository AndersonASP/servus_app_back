import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { SKIP_THROTTLE_KEY } from '../decorators/skip-throttle.decorator';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    protected readonly options: any,
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const skipThrottle = this.reflector.getAllAndOverride<boolean>(
      SKIP_THROTTLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipThrottle) {
      return true;
    }

    return super.shouldSkip(context);
  }
}
