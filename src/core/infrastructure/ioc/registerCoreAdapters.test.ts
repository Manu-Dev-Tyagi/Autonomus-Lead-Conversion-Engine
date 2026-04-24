import { describe, expect, it } from "vitest";

import { ClockPort } from "@/src/core/application/ports/ClockPort";
import { HistoricalOutcomesReadPort } from "@/src/core/application/ports/HistoricalOutcomesReadPort";
import { IdGeneratorPort } from "@/src/core/application/ports/IdGeneratorPort";
import { StrategyPlannerPort } from "@/src/core/application/ports/StrategyPlannerPort";
import { Container } from "@/src/core/infrastructure/ioc/container";
import { registerCoreAdapters } from "@/src/core/infrastructure/ioc/registerCoreAdapters";
import { IoCTokens } from "@/src/core/infrastructure/ioc/tokens";

describe("registerCoreAdapters", () => {
  it("registers base services in IoC container", () => {
    const container = new Container();
    registerCoreAdapters(container);

    const clock = container.resolve<ClockPort>(IoCTokens.Clock);
    const idGenerator = container.resolve<IdGeneratorPort>(IoCTokens.IdGenerator);
    const historicalOutcomes = container.resolve<HistoricalOutcomesReadPort>(
      IoCTokens.HistoricalOutcomesRead,
    );
    const strategyPlanner = container.resolve<StrategyPlannerPort>(
      IoCTokens.StrategyPlanner,
    );

    expect(clock.nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(idGenerator.nextUuid()).toHaveLength(36);
    expect(historicalOutcomes).toBeDefined();
    expect(strategyPlanner).toBeDefined();
  });
});
