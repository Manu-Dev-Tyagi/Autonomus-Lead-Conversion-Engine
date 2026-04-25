import { IoCToken } from "@/src/core/infrastructure/ioc/tokens";

export class Container {
  private readonly services = new Map<IoCToken, unknown>();

  register<T>(token: IoCToken, instance: T): void {
    if (this.services.has(token)) {
      return; // Already registered — skip silently (safe for serverless re-entry)
    }
    this.services.set(token, instance);
  }

  resolve<T>(token: IoCToken): T {
    if (!this.services.has(token)) {
      throw new Error("Token not registered.");
    }
    return this.services.get(token) as T;
  }

  has(token: IoCToken): boolean {
    return this.services.has(token);
  }
}

export const appContainer = new Container();
