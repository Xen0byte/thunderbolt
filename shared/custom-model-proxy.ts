/**
 * Shared wire-contract types for the custom-model proxy routes.
 *
 * Used by:
 *   - Frontend: src/ai/fetch.ts, src/settings/models/index.tsx
 *   - Backend:  backend/src/inference/custom-model-proxy.ts
 *
 * These strings are stable across deployments. Renaming a ProxyErrorCode
 * value is a breaking wire change that requires a coordinated frontend +
 * backend deploy. See TASK-001 for backend invariants; TASK-003 owns this
 * contract file.
 *
 * No runtime code — pure TypeScript types only.
 */

/**
 * Request body for POST /v1/custom-model/proxy.
 *
 * Frontend sends this to the Thunderbolt backend, which validates the
 * target URL (SSRF/allowlist checks per TASK-001), then proxies the
 * body to the user's custom OpenAI-compatible endpoint. Credentials are
 * kept in the body (never hoisted to headers) so they do not appear in
 * CORS allow-headers, CDN logs, or browser request metadata.
 *
 * See TASK-001 for all security invariants enforced at the backend.
 */
export type CustomModelProxyRequest = {
  /**
   * Full absolute URL of the user's custom endpoint, e.g.
   * "https://my-llm.example.com/v1/chat/completions".
   * Must be https:// in production. Backend validates the path suffix
   * against an allowlist (/v1/chat/completions, /v1/completions).
   */
  targetUrl: string;

  /**
   * User's API key for their custom endpoint. Sent in the request body,
   * never in a header, to avoid exposure in access logs or CDN metadata.
   * Optional for unauthenticated upstreams.
   *
   * INVARIANT: this value must NOT be echoed back in any ProxyErrorEnvelope
   * message. Enforced at the backend emission site (TASK-001).
   */
  upstreamAuth?: string;

  /**
   * HTTP method. Constrained to POST for chat/completions routes.
   */
  method: 'POST';

  /**
   * OpenAI-compatible chat completion request body (messages, model,
   * temperature, tools, etc.). Passed through verbatim to the upstream
   * after re-serialization by the backend. Capped at ~1 MB inbound.
   *
   * Typed as unknown to avoid coupling to the OpenAI SDK's shape, which
   * may change across SDK versions. The backend casts to the SDK type
   * internally; the wire contract remains stable. See TASK-003 contract
   * §v4 PIVOT for the architect's rationale.
   */
  body: unknown;

  /**
   * When true the client expects a text/event-stream (SSE) response.
   * When false the client expects application/json. The backend validates
   * that the upstream Content-Type matches (TASK-001 §RESEARCH-001 §A10
   * step 6). Mismatch results in UPSTREAM_CONTENT_TYPE error.
   */
  stream: boolean;
};

/**
 * Success response for POST /v1/custom-model/proxy (non-streaming case).
 *
 * When stream: true, the HTTP response body is the raw upstream SSE byte
 * stream; this type does NOT apply to that case. For the JSON case the
 * backend wraps the upstream response in this envelope.
 */
export type CustomModelProxyResponse = {
  /**
   * Upstream response body, JSON pass-through. Shape varies by upstream
   * endpoint. Callers are expected to narrow this type at the call site
   * (e.g. via the Vercel AI SDK or a runtime guard).
   */
  data: unknown;
};

/**
 * Request body for POST /v1/custom-model/models.
 *
 * Changed from GET + query-string to POST + JSON body so that the
 * upstreamAuth credential is never placed in the URL, which would
 * leak to access logs, CDN cache keys, WAF inspection, and browser history.
 *
 * See TASK-001 for SSRF validation applied to baseUrl.
 */
export type CustomModelModelsRequest = {
  /**
   * Base URL of the user's custom endpoint, e.g.
   * "https://animal.inference.thunderbolt.io/v1".
   * The backend appends "/models" and validates the resolved path
   * before making the upstream request.
   */
  baseUrl: string;

  /**
   * Optional upstream API key. Sent in the body, never in headers or the
   * query string, for the same reasons as CustomModelProxyRequest.upstreamAuth.
   */
  upstreamAuth?: string;
};

/**
 * Response shape for POST /v1/custom-model/models.
 *
 * Pass-through of the upstream /v1/models response. The canonical OpenAI
 * shape is { data: Array<{ id: string; object: 'model'; ... }> }. The TS
 * type is intentionally loose (Record<string, unknown> per entry) because
 * OpenAI-compatible upstreams vary in the extra fields they return
 * (created, owned_by, permission, etc.). The backend enforces id: string
 * at runtime before forwarding; TS is a loose map, not the source of truth.
 */
export type CustomModelModelsResponse = {
  data: Array<Record<string, unknown>>;
};

/**
 * Enumeration of error codes the backend returns in a ProxyErrorEnvelope.
 *
 * These codes are STABLE strings on the wire. The frontend (TASK-002/004)
 * maps them to US-004 user-facing error messages. Renaming any code is a
 * breaking wire change requiring a coordinated deploy.
 *
 * HTTP status associations (for reference; authoritative mapping is in TASK-001):
 *   400 — SSRF_BLOCKED, INVALID_URL, HOSTNAME_NOT_ALLOWED
 *   401 — UNAUTHORIZED
 *   413 — BODY_TOO_LARGE
 *   429 — RATE_LIMITED_USER, RATE_LIMITED_HOST
 *   502 — UPSTREAM_CONTENT_TYPE, UPSTREAM_PROTOCOL, UPSTREAM_AUTH,
 *           UPSTREAM_UNREACHABLE, SSE_LINE_TOO_LARGE
 *   503 — PROXY_DISABLED
 *   504 — UPSTREAM_TIMEOUT, DNS_TIMEOUT
 */
export type ProxyErrorCode =
  /** Target IP is in the SSRF denylist (private/loopback/link-local ranges). */
  | 'SSRF_BLOCKED'
  /** URL failed to parse, uses a disallowed scheme, or path is not allowlisted. */
  | 'INVALID_URL'
  /** Hostname resolves to .local / .localhost or contains userinfo (user:pass@). */
  | 'HOSTNAME_NOT_ALLOWED'
  /** Upstream returned a Content-Type that is neither application/json nor text/event-stream. */
  | 'UPSTREAM_CONTENT_TYPE'
  /** Upstream returned 101 Switching Protocols (WebSocket upgrade attempt). */
  | 'UPSTREAM_PROTOCOL'
  /** Upstream returned 401 or 403 (credentials rejected by the user's server). */
  | 'UPSTREAM_AUTH'
  /** DNS failure, connection refused, or TLS handshake failure. */
  | 'UPSTREAM_UNREACHABLE'
  /** Upstream did not respond within the configured timeout window. */
  | 'UPSTREAM_TIMEOUT'
  /** DNS resolution exceeded the 5-second cap (slow-DNS DoS defense). */
  | 'DNS_TIMEOUT'
  /** Inbound request body or total upstream streamed bytes exceeded the size cap. */
  | 'BODY_TOO_LARGE'
  /** A single SSE line from the upstream exceeded the per-line byte cap. */
  | 'SSE_LINE_TOO_LARGE'
  /** Per-user rate limit exceeded. */
  | 'RATE_LIMITED_USER'
  /** Per-target-host global rate limit exceeded. */
  | 'RATE_LIMITED_HOST'
  /** Proxy feature is disabled (CUSTOM_PROXY_ENABLED=false). */
  | 'PROXY_DISABLED'
  /** Thunderbolt session is invalid or missing. */
  | 'UNAUTHORIZED';

/**
 * Standard error envelope returned by /v1/custom-model/* routes on failure.
 *
 * INVARIANT: error.message must NOT contain the caller's upstreamAuth or any
 * backend credential. Safe to render directly in UI. Enforced at the backend
 * emission site (TASK-001).
 */
export type ProxyErrorEnvelope = {
  error: {
    /** Machine-readable error code. Maps to US-004 user-facing messages on the frontend. */
    code: ProxyErrorCode;
    /**
     * Human-readable description. Safe to display in the UI. Must NOT echo
     * user-supplied API keys or backend secrets.
     */
    message: string;
    /**
     * HTTP status code the backend returned. Mirrors the response status for
     * callers that only inspect the response body.
     */
    httpStatus: number;
  };
};
