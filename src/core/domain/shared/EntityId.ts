const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export abstract class EntityId {
  protected constructor(public readonly value: string) {
    if (!uuidRegex.test(value)) {
      throw new Error(`Invalid UUID: ${value}`);
    }
  }

  equals(other: EntityId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
