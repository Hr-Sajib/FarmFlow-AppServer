import config from "./index";

/**
 * One allowlist, shared by the HTTP layer and the Socket.IO handshake.
 *
 * These were two separate settings and they drifted: Express read CORS_ORIGINS
 * while the socket read CLIENT_ORIGIN and defaulted to localhost. A deployment
 * that set the first still had every websocket upgrade from the live site
 * rejected, so live telemetry and streamed advisory replies died while ordinary
 * requests kept working — a miserable thing to diagnose. Exporting one value is
 * what stops them drifting again.
 */

if (config.NODE_ENV === "production" && config.cors_origins.length === 0) {
  throw new Error(
    "CORS_ORIGINS must be set in production. Session cookies are issued with " +
      "SameSite=None so the browser attaches them to cross-site requests; " +
      "reflecting back whatever origin asked, with credentials enabled, would " +
      "let any website call this API as the signed-in user. Set a comma " +
      "separated list, e.g. CORS_ORIGINS=https://farmflow.sajibofficial.me"
  );
}

export const corsOptions = {
  /**
   * Reflecting the caller is only reachable in development, where it keeps
   * assorted localhost ports and 127.0.0.1 working with no configuration.
   * Production cannot arrive here — the check above refuses to boot instead of
   * starting wide open, because a permissive default is invisible until it is
   * exploited.
   */
  origin: config.cors_origins.length ? config.cors_origins : true,
  credentials: true,
};
