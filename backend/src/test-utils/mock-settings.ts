import type { Settings } from '@/config/settings'

/**
 * Default mock settings for tests.
 * Use this to avoid duplicating settings in every test file.
 */
export const createMockSettings = (overrides: Partial<Settings> = {}): Settings => ({
  fireworksApiKey: 'test-api-key',
  mistralApiKey: '',
  anthropicApiKey: '',
  exaApiKey: '',
  thunderboltInferenceUrl: '',
  thunderboltInferenceApiKey: '',
  monitoringToken: '',
  googleClientId: '',
  googleClientSecret: '',
  microsoftClientId: '',
  microsoftClientSecret: '',
  powersyncJwtSecret: 'test-powersync-secret',
  powersyncUrl: 'http://localhost:8080',
  powersyncTokenExpirySeconds: 3600,
  logLevel: 'INFO',
  port: 8000,
  posthogHost: 'https://us.i.posthog.com',
  posthogApiKey: 'ph_test',
  corsOrigins: 'http://localhost:1420',
  corsOriginRegex: '',
  corsAllowCredentials: true,
  corsAllowMethods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  corsAllowHeaders:
    'Content-Type,Authorization,Accept,Accept-Encoding,Accept-Language,Cache-Control,User-Agent,X-Requested-With',
  corsExposeHeaders: 'mcp-session-id',
  ...overrides,
})
