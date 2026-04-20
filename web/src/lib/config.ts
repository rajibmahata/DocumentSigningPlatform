/**
 * Central configuration — all URLs and env-derived values go here.
 * Never use process.env or hardcoded URLs anywhere else in the codebase.
 *
 * Set values in .env.local (development) or environment variables (production).
 * See .env.example for the full list of supported variables.
 */

export const apiBaseUrl  = process.env.NEXT_PUBLIC_API_URL  ?? 'http://localhost:5163';
export const appBaseUrl  = process.env.NEXT_PUBLIC_APP_URL  ?? 'http://localhost:3000';
export const swaggerUrl  = `${apiBaseUrl}/swagger`;
