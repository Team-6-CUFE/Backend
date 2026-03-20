import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from '../types/oauth-profile.type';

type FacebookVerifyCallback = (error: Error | null, user?: OAuthProfile | false) => void;

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID'),
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL'),
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name'],
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: FacebookVerifyCallback
  ): Promise<void> {
    const { name, emails, id } = profile;

    if (!emails || !emails[0]?.value) {
      return done(
        new BadRequestException(
          'We could not retrieve your email from Facebook. Please make sure your Facebook account has an email address and try again.'
        ),
        false
      );
    }

    const oauthProfile: OAuthProfile = {
      provider: 'facebook',
      providerId: id,
      email: emails[0].value,
      firstName: name?.givenName ?? '',
      lastName: name?.familyName ?? '',
    };

    return done(null, oauthProfile);
  }
}
