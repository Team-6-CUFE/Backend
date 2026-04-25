import 'express-session';

declare module 'express-session' {
  interface SessionData {
    /** Mobile OAuth login: deep-link URI to redirect to after the OAuth flow completes. */
    oauthRedirectUri?: string;
    /** OAuth account linking: userId extracted before the OAuth redirect. */
    linkUserId?: string;
    /** Mobile OAuth linking: deep-link URI to redirect to after the link flow completes. */
    oauthLinkRedirectUri?: string;
  }
}
