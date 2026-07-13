import { z } from "zod";

const clientRevision = z.number().int().min(1).max(2_147_483_647);
const workingLine = z.string().trim().max(2_000);
const graphPoint = z.object({
  x: z.number().finite().min(-1_000_000).max(1_000_000),
  y: z.number().finite().min(-1_000_000).max(1_000_000),
}).strict();

const structuredAnswer = z.object({
  workingLines: z.array(workingLine).max(40).optional(),
  graphPoints: z.array(graphPoint).max(250).optional(),
  finalAnswer: z.string().trim().max(4_000).optional(),
}).strict();

const structuredResponse = structuredAnswer.extend({
  parts: z.record(z.string().min(1).max(64), structuredAnswer).optional(),
}).strict();

export const putAttemptResponseSchema = z.union([
  z.object({
    clientRevision,
    selectedOptionId: z.string().uuid(),
  }).strict(),
  z.object({
    clientRevision,
    response: structuredResponse,
  }).strict(),
]);

export const patchAttemptFlagSchema = z.object({
  clientRevision,
  isFlagged: z.boolean(),
}).strict();

export type StructuredResponse = z.infer<typeof structuredResponse>;
