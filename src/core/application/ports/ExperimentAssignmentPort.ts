export interface ExperimentAssignmentPort {
  assign(input: {
    tenantId: string;
    experimentKey: string;
    subjectId: string;
    variants: string[];
  }): Promise<string>;
}
