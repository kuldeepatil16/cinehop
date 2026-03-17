import { createHash } from "node:crypto";

export function hashIp(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function jsonResponse<T>(body: T, init?: ResponseInit): Response {
  return Response.json(body, init);
}
