import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { DateUtil } from '../../common/utils/date.util';
import {
  JiraAuthUrlResponse,
  JiraConnectionResponse,
  JiraIssueResponse,
} from './models/jira.response';

const ATLASSIAN_AUTH_URL = 'https://auth.atlassian.com/authorize';
const ATLASSIAN_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const ATLASSIAN_RESOURCES_URL =
  'https://api.atlassian.com/oauth/token/accessible-resources';
const ATLASSIAN_API_BASE = 'https://api.atlassian.com/ex/jira';

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 dakika
const TOKEN_REFRESH_BUFFER_MS = 60_000; // 60 saniye

interface AdfNode {
  type?: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
}

interface AtlassianTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

interface AtlassianSite {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
}

@Injectable()
export class JiraService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.clientId = this.configService.getOrThrow<string>(
      'ATLASSIAN_CLIENT_ID',
    );
    this.clientSecret = this.configService.getOrThrow<string>(
      'ATLASSIAN_CLIENT_SECRET',
    );
    this.callbackUrl = this.configService.getOrThrow<string>(
      'ATLASSIAN_CALLBACK_URL',
    );
  }

  getAuthUrl(userId: string): JiraAuthUrlResponse {
    const statePayload = JSON.stringify({ userId, timestamp: Date.now() });
    const encryptedState = CryptoUtil.encrypt(statePayload);

    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: this.clientId,
      scope: 'read:jira-work offline_access',
      redirect_uri: this.callbackUrl,
      state: this.toBase64Url(encryptedState),
      response_type: 'code',
      prompt: 'consent',
    });

    return { authUrl: `${ATLASSIAN_AUTH_URL}?${params.toString()}` };
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const userId = this.decryptAndValidateState(state);

    const tokens = await this.exchangeCodeForTokens(code);

    const sites = await this.getAccessibleSites(tokens.access_token);
    if (sites.length === 0) {
      throw new BadRequestException('Erisilebilir Jira sitesi bulunamadi');
    }

    const site = sites[0];
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await this.prisma.jiraConnection.upsert({
      where: { userId },
      create: {
        userId,
        cloudId: site.id,
        siteUrl: site.url,
        siteName: site.name,
        accessToken: CryptoUtil.encrypt(tokens.access_token),
        refreshToken: CryptoUtil.encrypt(tokens.refresh_token),
        expiresAt,
      },
      update: {
        cloudId: site.id,
        siteUrl: site.url,
        siteName: site.name,
        accessToken: CryptoUtil.encrypt(tokens.access_token),
        refreshToken: CryptoUtil.encrypt(tokens.refresh_token),
        expiresAt,
      },
    });
  }

  async getConnection(userId: string): Promise<JiraConnectionResponse> {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { userId },
    });
    if (!connection) {
      throw new NotFoundException('Jira baglantisi bulunamadi');
    }
    return this.toResponse(connection);
  }

  async deleteConnection(userId: string): Promise<{ message: string }> {
    const existing = await this.prisma.jiraConnection.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException('Jira baglantisi bulunamadi');
    }
    await this.prisma.jiraConnection.delete({ where: { userId } });
    return { message: 'Jira baglantisi silindi' };
  }

  async getIssue(userId: string, issueKey: string): Promise<JiraIssueResponse> {
    if (!/^[A-Z][A-Z0-9]+-\d+$/.test(issueKey)) {
      throw new BadRequestException(
        'Gecersiz Jira issue key formati (orn: PROJ-123)',
      );
    }

    const connection = await this.prisma.jiraConnection.findUnique({
      where: { userId },
    });
    if (!connection) {
      throw new NotFoundException(
        'Jira baglantisi yok. Once Jira ile baglanin.',
      );
    }

    const accessToken = await this.getValidAccessToken(connection);

    const url = `${ATLASSIAN_API_BASE}/${connection.cloudId}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedException(
        'Jira yetkilendirme hatasi. Baglantiyi yeniden kurun.',
      );
    }
    if (response.status === 404) {
      throw new NotFoundException(`Jira issue bulunamadi: ${issueKey}`);
    }
    if (!response.ok) {
      throw new BadRequestException(
        `Jira API hatasi: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      key: string;
      fields: {
        summary?: string;
        description?: AdfNode | string | null;
        issuetype?: { name?: string };
        status?: { name?: string };
      };
    };

    return {
      key: data.key,
      summary: data.fields.summary ?? '',
      description: this.adfToPlainText(data.fields.description),
      issueType: data.fields.issuetype?.name ?? '',
      status: data.fields.status?.name ?? '',
      url: `${connection.siteUrl}/browse/${data.key}`,
    };
  }

  // --- Private: OAuth helpers ---

  private decryptAndValidateState(state: string): string {
    let payload: { userId: string; timestamp: number };

    try {
      const decrypted = CryptoUtil.decrypt(this.fromBase64Url(state));
      payload = JSON.parse(decrypted) as { userId: string; timestamp: number };
    } catch {
      throw new BadRequestException('Gecersiz OAuth state parametresi');
    }

    if (!payload.userId || !payload.timestamp) {
      throw new BadRequestException('Gecersiz OAuth state icerigi');
    }

    const age = Date.now() - payload.timestamp;
    if (age > STATE_MAX_AGE_MS) {
      throw new BadRequestException(
        'OAuth state suresi doldu. Lutfen tekrar deneyin.',
      );
    }

    return payload.userId;
  }

  private async exchangeCodeForTokens(
    code: string,
  ): Promise<AtlassianTokenResponse> {
    const response = await fetch(ATLASSIAN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
      }),
    });

    if (!response.ok) {
      throw new BadRequestException(
        'Atlassian token degisimi basarisiz. Lutfen tekrar deneyin.',
      );
    }

    return (await response.json()) as AtlassianTokenResponse;
  }

  private async getAccessibleSites(
    accessToken: string,
  ): Promise<AtlassianSite[]> {
    const response = await fetch(ATLASSIAN_RESOURCES_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new BadRequestException('Atlassian site bilgisi alinamadi');
    }

    return (await response.json()) as AtlassianSite[];
  }

  private async getValidAccessToken(connection: {
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }): Promise<string> {
    const timeRemaining = connection.expiresAt.getTime() - Date.now();

    if (timeRemaining > TOKEN_REFRESH_BUFFER_MS) {
      return CryptoUtil.decrypt(connection.accessToken);
    }

    const refreshToken = CryptoUtil.decrypt(connection.refreshToken);

    const response = await fetch(ATLASSIAN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      await this.prisma.jiraConnection.delete({
        where: { userId: connection.userId },
      });
      throw new UnauthorizedException(
        'Jira oturumu suresi doldu. Lutfen yeniden baglanin.',
      );
    }

    const data = (await response.json()) as AtlassianTokenResponse;
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

    await this.prisma.jiraConnection.update({
      where: { userId: connection.userId },
      data: {
        accessToken: CryptoUtil.encrypt(data.access_token),
        refreshToken: CryptoUtil.encrypt(data.refresh_token),
        expiresAt: newExpiresAt,
      },
    });

    return data.access_token;
  }

  // --- Private: Base64 URL-safe encoding ---

  private toBase64Url(base64: string): string {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private fromBase64Url(base64url: string): string {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return base64;
  }

  // --- Private: Response helper ---

  private toResponse(connection: {
    siteUrl: string;
    siteName: string;
    connectedAt: Date;
    updatedAt: Date;
  }): JiraConnectionResponse {
    return {
      siteUrl: connection.siteUrl,
      siteName: connection.siteName,
      connectedAt: DateUtil.format(connection.connectedAt),
      updatedAt: DateUtil.format(connection.updatedAt),
    };
  }

  // --- Private: ADF parser (unchanged) ---

  private adfToPlainText(adf: AdfNode | string | null | undefined): string {
    if (!adf) return '';
    if (typeof adf === 'string') return adf;
    return this.flattenAdfNode(adf).trim();
  }

  private flattenAdfNode(node: AdfNode): string {
    if (!node) return '';
    if (node.type === 'text' && node.text) return node.text;
    if (node.type === 'hardBreak') return '\n';

    const children = (node.content ?? [])
      .map((c) => this.flattenAdfNode(c))
      .join('');

    switch (node.type) {
      case 'paragraph':
      case 'heading':
      case 'blockquote':
        return children + '\n\n';
      case 'listItem':
        return `- ${children}\n`;
      case 'bulletList':
      case 'orderedList':
        return children + '\n';
      case 'codeBlock':
        return `\n${children}\n`;
      default:
        return children;
    }
  }
}
