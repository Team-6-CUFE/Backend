import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../authentication/decorators/public.decorator';

const APP_NAME = 'Harmonica';
const CONTACT_EMAIL = 'support@harmonica.app';
const LAST_UPDATED = 'March 2026';

const baseHtml = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta property="og:title" content="${title} — ${APP_NAME}" />
  <meta property="og:description" content="${title} for ${APP_NAME}, a music streaming platform." />
  <meta property="og:image" content="https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/16-hole_chrom_10-hole_diatonic.jpg/500px-16-hole_chrom_10-hole_diatonic.jpg" />
  <meta property="og:type" content="website" />
  <title>${title} — ${APP_NAME}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 60px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; }
    h1 { font-size: 2rem; margin-bottom: 4px; }
    h2 { font-size: 1.2rem; margin-top: 36px; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 40px; }
    p, li { color: #333; }
    a { color: #6200ea; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Last updated: ${LAST_UPDATED} &nbsp;·&nbsp; ${APP_NAME}</p>
  ${body}
  <p style="margin-top:48px; color:#999; font-size:0.85rem;">Questions? Contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
</body>
</html>`;

const PRIVACY_BODY = `
  <p>${APP_NAME} ("we", "our", or "us") is a music streaming platform. This Privacy Policy explains what data we collect and how we use it.</p>

  <h2>Information We Collect</h2>
  <ul>
    <li><strong>Account data:</strong> name, email address, username, and profile picture when you register.</li>
    <li><strong>Social login data:</strong> when you sign in via Google or Facebook, we receive your name, email, and profile picture from those providers.</li>
    <li><strong>Usage data:</strong> tracks you play, like, repost, or comment on.</li>
    <li><strong>Device data:</strong> IP address, browser type, and country for security and analytics.</li>
  </ul>

  <h2>How We Use Your Information</h2>
  <ul>
    <li>To provide and personalise the ${APP_NAME} service.</li>
    <li>To send account-related emails (verification, password reset).</li>
    <li>To improve platform features and performance.</li>
    <li>To comply with legal obligations.</li>
  </ul>

  <h2>Data Sharing</h2>
  <p>We do not sell your personal data. We may share data with service providers (cloud storage, email delivery) strictly to operate the platform.</p>

  <h2>Data Retention</h2>
  <p>We retain your data for as long as your account is active. You may request deletion at any time by contacting us.</p>

  <h2>Your Rights</h2>
  <p>Depending on your jurisdiction you may have the right to access, correct, or delete your personal data. Contact us at the address below to exercise these rights.</p>

  <h2>Cookies</h2>
  <p>We use cookies for authentication sessions. No third-party advertising cookies are used.</p>

  <h2>Changes</h2>
  <p>We may update this policy periodically. Continued use of the platform after changes constitutes acceptance.</p>
`;

const TERMS_BODY = `
  <p>By using ${APP_NAME} you agree to these Terms of Service. Please read them carefully.</p>

  <h2>1. Eligibility</h2>
  <p>You must be at least 13 years old to use ${APP_NAME}. By using the service you represent that you meet this requirement.</p>

  <h2>2. Your Account</h2>
  <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorised access.</p>

  <h2>3. Content</h2>
  <p>You retain ownership of content you upload. By uploading content you grant ${APP_NAME} a licence to display and stream it on the platform. You must not upload content that infringes third-party rights or violates applicable law.</p>

  <h2>4. Prohibited Conduct</h2>
  <ul>
    <li>Uploading infringing, illegal, or harmful content.</li>
    <li>Attempting to reverse-engineer or compromise the platform.</li>
    <li>Harassing or abusing other users.</li>
    <li>Using automated tools to scrape or abuse the service.</li>
  </ul>

  <h2>5. Termination</h2>
  <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>

  <h2>6. Disclaimer</h2>
  <p>The service is provided "as is" without warranties of any kind. We are not liable for any indirect or consequential damages arising from use of the platform.</p>

  <h2>7. Governing Law</h2>
  <p>These terms are governed by applicable law. Any disputes shall be resolved through good-faith negotiation first.</p>

  <h2>8. Changes</h2>
  <p>We may update these terms at any time. Continued use of the platform after changes constitutes acceptance.</p>
`;

@ApiExcludeController()
@Public()
@Controller()
export class LegalController {
  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacy(@Res() res: Response) {
    res.send(baseHtml('Privacy Policy', PRIVACY_BODY));
  }

  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  terms(@Res() res: Response) {
    res.send(baseHtml('Terms of Service', TERMS_BODY));
  }
}
