import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { DateUtil } from '../../common/utils/date.util';
import { SaveJiraConnectionRequest } from './models/jira.request';
import {
  JiraConnectionResponse,
  JiraIssueResponse,
} from './models/jira.response';

interface AdfNode {
  type?: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
}

@Injectable()
export class JiraService {
  constructor(private prisma: PrismaService) {}

  async saveConnection(
    userId: string,
    request: SaveJiraConnectionRequest,
  ): Promise<JiraConnectionResponse> {
    const baseUrl = this.normalizeBaseUrl(request.baseUrl);
    await this.verifyCredentials(baseUrl, request.email, request.apiToken);

    const encryptedToken = CryptoUtil.encrypt(request.apiToken);

    const connection = await this.prisma.jiraConnection.upsert({
      where: { userId },
      create: {
        userId,
        baseUrl,
        email: request.email,
        apiToken: encryptedToken,
      },
      update: {
        baseUrl,
        email: request.email,
        apiToken: encryptedToken,
      },
    });

    return this.toResponse(connection);
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
        'Jira baglantisi yok. Once /api/jira/connection ile baglan',
      );
    }

    const token = CryptoUtil.decrypt(connection.apiToken);
    const url = `${connection.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: this.basicAuthHeader(connection.email, token),
        Accept: 'application/json',
      },
    });

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedException(
        'Jira yetkilendirme hatasi. Baglantiyi yeniden kur.',
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
      url: `${connection.baseUrl}/browse/${data.key}`,
    };
  }

  private async verifyCredentials(
    baseUrl: string,
    email: string,
    apiToken: string,
  ): Promise<void> {
    const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
      headers: {
        Authorization: this.basicAuthHeader(email, apiToken),
        Accept: 'application/json',
      },
    });
    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedException(
        'Jira kimlik dogrulama basarisiz. Email ve API token kontrol et.',
      );
    }
    if (!response.ok) {
      throw new BadRequestException(
        `Jira baglanti testi basarisiz: ${response.status} ${response.statusText}`,
      );
    }
  }

  private basicAuthHeader(email: string, token: string): string {
    const credentials = Buffer.from(`${email}:${token}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
  }

  private toResponse(connection: {
    baseUrl: string;
    email: string;
    connectedAt: Date;
    updatedAt: Date;
  }): JiraConnectionResponse {
    return {
      baseUrl: connection.baseUrl,
      email: connection.email,
      connectedAt: DateUtil.format(connection.connectedAt),
      updatedAt: DateUtil.format(connection.updatedAt),
    };
  }

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
