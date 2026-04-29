export type RequestId = string & { readonly __brand: "RequestId" };
export type TraceId = string & { readonly __brand: "TraceId" };

export function createRequestId(): RequestId {
  return `req_${randomHex(12)}` as RequestId;
}

export function createTraceId(): TraceId {
  return `tr_${randomHex(16)}` as TraceId;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}
