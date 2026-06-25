import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private jwtService;
    private googleClient;
    constructor(jwtService: JwtService);
    validateGoogleToken(token: string): Promise<{
        email: string | undefined;
        nom: string | undefined;
        prenom: string | undefined;
        googleId: string;
    }>;
    generateJwt(user: {
        id: string;
        email: string;
        role: string;
    }): string;
}
