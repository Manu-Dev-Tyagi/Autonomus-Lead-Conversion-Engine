import { ResponseIntent } from "@/src/core/domain/interaction/ResponseIntent";

export interface ResponseInterpreterPort {
  interpret(input: { tenantId: string; leadId: string; inboundText: string }): Promise<ResponseIntent>;
}
