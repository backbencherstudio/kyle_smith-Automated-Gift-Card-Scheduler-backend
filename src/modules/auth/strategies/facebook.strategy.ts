// src/modules/auth/strategies/facebook.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { Injectable } from '@nestjs/common';
import appConfig from '../../../config/app.config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      clientID: appConfig().auth.facebook.app_id,
      clientSecret: appConfig().auth.facebook.app_secret,
      callbackURL: appConfig().auth.facebook.callback,
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'picture'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    try {
      // Log the profile data to see what we're receiving
      console.log('Facebook Profile:', JSON.stringify(profile, null, 2));

      const user = {
        email: profile.emails?.[0]?.value || null,
        firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || null,
        lastName: profile.name?.familyName || profile.displayName?.split(' ')[1] || null,
        picture: profile.photos?.[0]?.value || null,
        accessToken,
        refreshToken,
        id: profile.id,
      };

      // Log the processed user data
      console.log('Processed User Data:', JSON.stringify(user, null, 2));

      done(null, user);
    } catch (error) {
      console.error('Facebook Strategy Error:', error);
      done(error, null);
    }
  }
}