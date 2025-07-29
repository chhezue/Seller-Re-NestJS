import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  extractTokenFromHeader(headerRawToken: string, isBearer: boolean) {
    const splitToken = headerRawToken.split(' ');
    const prefix = isBearer ? 'Bearer' : 'Basic';
    if (splitToken.length !== 2 || splitToken[0] !== prefix) {
      throw new UnauthorizedException('Invalid token format');
    }

    return splitToken[1];
  }

  decodedBasicToken(base64String: string) {
    const decoded = Buffer.from(base64String, 'base64').toString('utf8');
    const [email, password] = decoded.split(':');

    if (!email || !password) {
      throw new UnauthorizedException('Invalid Base Token(email or password)');
    }

    return { email, password };
  }

  async loginWithEmail() {}
}
