import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from '../types/oauth-profile.type';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    const { name, emails, id } = profile;

    if (!emails || !emails[0]?.value) {
      return done(
        new BadRequestException(
          'We could not retrieve your email from Google. Please make sure your Google account has an email address and try again.'
        ),
        false
      );
    }

    if (!name || !name?.givenName) {
      return done(
        new BadRequestException(
          'We could not retrieve your name from Google. Please make sure your Google account has a name and try again.'
        ),
        false
      );
    }

    const oauthProfile: OAuthProfile = {
      provider: 'google',
      providerId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
    };
    return done(null, oauthProfile);
  }
}
