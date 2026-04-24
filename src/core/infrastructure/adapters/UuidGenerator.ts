import { randomUUID } from "node:crypto";

import { IdGeneratorPort } from "@/src/core/application/ports/IdGeneratorPort";

export class UuidGenerator implements IdGeneratorPort {
  nextUuid(): string {
    return randomUUID();
  }
}
