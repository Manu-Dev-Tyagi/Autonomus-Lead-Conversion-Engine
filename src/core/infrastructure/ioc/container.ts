import { IoCToken } from "@/src/core/infrastructure/ioc/tokens";

export class Container {
  private readonly services = new Map<IoCToken, unknown>();

  register<T>(token: IoCToken, instance: T): void {
    if (this.services.has(token)) {
      throw new Error("Token already registered.");
    }
    this.services.set(token, instance);
  }

  resolve<T>(token: IoCToken): T {
    if (!this.services.has(token)) {
      throw new Error("Token not registered.");
    }
    return this.services.get(token) as T;
  }
}

export const appContainer = new Container();
