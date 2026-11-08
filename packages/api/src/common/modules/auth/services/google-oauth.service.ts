import { BooleanNumber, UserTerminal, UserTerminalType } from "@buildingai/constants";
import { checkUserLoginPlayground, LoginUserPlayground } from "@buildingai/db";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import { getFrontendBaseUrl } from "@buildingai/utils";
import { GoogleConfigService } from "../../../../modules/channel/services/google-config.service";
import { UserService } from "../../../../modules/user/services/user.service";
import { UserTokenService } from "./user-token.service";

/**
 * Google OAuth 2.0 Service
 *
 * Implements the OAuth 2.0 authorization code flow for Google authentication:
 * 1. Build authorization URL
 * 2. Exchange authorization code for access token
 * 3. Fetch user info from Google
 * 4. Find or create user and return app token
 */
@Injectable()
export class GoogleOAuthService {
    private readonly TOKEN_URL = "https://oauth2.googleapis.com/token";
    private readonly USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
    private readonly AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private readonly SCOPES = "openid email profile";

    constructor(
        private readonly configService: GoogleConfigService,
        private readonly userService: UserService,
        private readonly userTokenService: UserTokenService,
    ) { }

    /**
     * Step 1: Build Google OAuth authorization URL
     *
     * @param state Random state string for CSRF protection
     * @returns Authorization URL to redirect user to Google
     * @throws Error if Google OAuth is not properly configured
     */
    async getAuthorizationUrl(state: string): Promise<string> {
        const config = await this.configService.getConfig();

        if (!config.clientId || !config.clientSecret) {
            throw HttpErrorFactory.unauthorized("Google OAuth is not configured. Please configure clientId and clientSecret.");
        }

        const redirectUri = `${getFrontendBaseUrl()}/api/auth/google-callback`;
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: this.SCOPES,
            state,
        });

        return `${this.AUTH_URL}?${params}`;
    }

    /**
     * Step 2: Exchange authorization code for access token
     *
     * @param code Authorization code from Google callback
     * @param redirectUri Redirect URI used in the authorization request
     * @returns Access token response
     * @throws Error if token exchange fails
     */
    private async exchangeCodeForToken(
        code: string,
        redirectUri: string,
    ): Promise<{ access_token: string }> {
        const config = await this.configService.getConfig();

        const response = await fetch(this.TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            throw HttpErrorFactory.unauthorized(`Google token exchange failed: ${response.status} - ${errorText}`);
        }

        return response.json() as Promise<{ access_token: string }>;
    }

    /**
     * Step 3: Fetch user info from Google
     *
     * @param accessToken Google access token
     * @returns Google user info
     * @throws Error if user info fetch fails
     */
    private async fetchUserInfo(accessToken: string): Promise<{
        id: string;
        email?: string;
        name?: string;
        picture?: string;
    }> {
        const response = await fetch(this.USER_INFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            throw HttpErrorFactory.unauthorized(`Google user info fetch failed: ${response.status} - ${errorText}`);
        }

        return response.json() as Promise<{ id: string; email?: string; name?: string; picture?: string }>;
    }

    /**
     * Step 4: Handle callback - find or create user, return token
     *
     * @param code Authorization code from Google callback
     * @param redirectUri Redirect URI used in the authorization request
     * @param terminal Login terminal type
     * @param ipAddress Client IP address (optional)
     * @param userAgent Client user agent (optional)
     * @returns Token result with user info
     */
    async handleCallback(
        code: string,
        state: string,
        redirectUri: string,
        terminal: UserTerminalType = UserTerminal.PC,
        ipAddress?: string,
        userAgent?: string,
    ) {
        // Validate state parameter for CSRF protection
        if (!state || state.trim() === "") {
            throw HttpErrorFactory.unauthorized("Invalid state parameter: CSRF validation failed");
        }

        // Exchange code for access token
        const { access_token } = await this.exchangeCodeForToken(code, redirectUri);

        // Fetch user info from Google
        const userInfo = await this.fetchUserInfo(access_token);
        const googleOpenid = userInfo.id;

        // Find or create user by Google OpenID
        let user = await this.userService.findByGoogleOpenid(googleOpenid);

        if (!user) {
            user = await this.userService.createByGoogle({
                googleOpenid,
                email: userInfo.email,
                nickname: userInfo.name,
                avatar: userInfo.picture,
            });
        }

        // Build login playground payload
        const payload: LoginUserPlayground = checkUserLoginPlayground({
            id: user.id,
            username: user.username,
            isRoot: user.isRoot ?? BooleanNumber.NO,
            terminal,
        });

        // Create app token
        const tokenResult = await this.userTokenService.createToken(
            user.id,
            payload,
            terminal,
            ipAddress,
            userAgent,
        );

        return {
            token: tokenResult.token,
            expiresAt: tokenResult.expiresAt,
            user,
        };
    }
}
