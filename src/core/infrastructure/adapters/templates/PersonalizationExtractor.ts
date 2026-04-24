export class PersonalizationExtractor {
  extract(input: {
    subjectTemplate: string;
    bodyTemplate: string;
    leadAttributes?: Record<string, string | number | boolean>;
  }): Record<string, string> {
    const placeholders = this.findPlaceholders(`${input.subjectTemplate}\n${input.bodyTemplate}`);
    const attributes = input.leadAttributes ?? {};
    const output: Record<string, string> = {};

    for (const key of placeholders) {
      const value = attributes[key];
      if (value !== undefined) {
        output[key] = String(value);
      }
    }
    return output;
  }

  private findPlaceholders(content: string): string[] {
    const found = new Set<string>();
    const matches = content.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
    for (const match of matches) {
      if (match[1]) {
        found.add(match[1]);
      }
    }
    return Array.from(found);
  }
}
