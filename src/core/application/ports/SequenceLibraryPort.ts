export interface SequenceDefinition {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly stepCount: number;
  readonly channel: "email";
}

export interface SequenceLibraryPort {
  listByTenant(tenantId: string): Promise<SequenceDefinition[]>;
}
