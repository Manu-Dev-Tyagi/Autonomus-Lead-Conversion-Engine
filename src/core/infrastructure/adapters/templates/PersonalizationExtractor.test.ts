import { describe, expect, it } from "vitest";

import { PersonalizationExtractor } from "@/src/core/infrastructure/adapters/templates/PersonalizationExtractor";

describe("PersonalizationExtractor", () => {
  it("extracts template placeholders from lead attributes", () => {
    const extractor = new PersonalizationExtractor();
    const values = extractor.extract({
      subjectTemplate: "Quick note for {{company}}",
      bodyTemplate: "Hi {{firstName}}, saw {{company}} hiring.",
      leadAttributes: {
        firstName: "Alex",
        company: "Acme",
        ignored: "x",
      },
    });
    expect(values).toEqual({
      firstName: "Alex",
      company: "Acme",
    });
  });
});
