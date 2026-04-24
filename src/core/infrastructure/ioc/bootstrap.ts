import { appContainer } from "@/src/core/infrastructure/ioc/container";
import { registerCoreAdapters } from "@/src/core/infrastructure/ioc/registerCoreAdapters";

let bootstrapped = false;

export function getAppContainer() {
  if (!bootstrapped) {
    registerCoreAdapters(appContainer);
    bootstrapped = true;
  }
  return appContainer;
}
