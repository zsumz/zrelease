import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { MAX_CRATE } from './archive.ts';
import { ReleaseError, requireThat } from './common.ts';

export class HttpError extends ReleaseError {
  readonly status: number;
  constructor(status: number, method: string, url: string) {
    super(`${method} ${url}: HTTP ${status}`);
    this.status = status;
  }
}
export class TransportError extends ReleaseError {}
export interface RequestOptions { body?: Buffer; token?: string; github?: boolean; limit?: number }
export interface Transport { request(method: string, url: string, options?: RequestOptions): Promise<Buffer> }

export class Http implements Transport {
  readonly localTest: boolean;
  constructor(localTest = false) { this.localTest = localTest; }

  async request(method: string, url: string, options: RequestOptions = {}): Promise<Buffer> {
    const parsed = new URL(url);
    if (this.localTest) requireThat(parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1', 'test transport only allows IPv4 loopback');
    else {
      requireThat(parsed.protocol === 'https:' && ['crates.io', 'index.crates.io', 'static.crates.io', 'api.github.com'].includes(parsed.hostname), 'unapproved HTTP destination');
      requireThat(parsed.port === '' || parsed.port === '443', 'unapproved HTTPS port');
    }
    requireThat(!parsed.username && !parsed.password && !parsed.hash, 'invalid HTTP URL');
    const { body, token, github = false, limit = MAX_CRATE + 1 } = options;
    if (token) {
      requireThat(['PUT', 'POST'].includes(method) && (this.localTest || ['crates.io', 'api.github.com'].includes(parsed.hostname)), 'refusing to send credentials to this endpoint');
      requireThat(!/[\r\n]/.test(token), 'invalid credential');
    }
    const headers: Record<string, string | number> = {
      'User-Agent': 'zrelease/0.1 (https://github.com/zsumz/zrelease)', Accept: 'application/json',
    };
    if (body) { headers['Content-Type'] = github ? 'application/json' : 'application/octet-stream'; headers['Content-Length'] = body.length; }
    if (token) headers.Authorization = (github ? 'Bearer ' : '') + token;
    if (github) { headers.Accept = 'application/vnd.github+json'; headers['X-GitHub-Api-Version'] = '2022-11-28'; }
    return new Promise((resolve, reject) => {
      // Native request never follows redirects and sends the sealed bytes verbatim.
      const send = parsed.protocol === 'https:' ? httpsRequest : httpRequest;
      const request = send(parsed, { method, headers }, response => {
        const status = response.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          reject(new HttpError(status, method, url)); response.destroy(); return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > limit) {
            reject(new ReleaseError('HTTP response exceeds the configured size limit')); response.destroy();
          } else chunks.push(chunk);
        });
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', () => reject(new TransportError(`${method} ${url}: transport failure; remote outcome may be unknown`)));
      });
      const timer = setTimeout(() => request.destroy(new Error('request deadline exceeded')), 30_000);
      request.on('close', () => clearTimeout(timer));
      request.on('error', () => reject(new TransportError(`${method} ${url}: transport failure; remote outcome may be unknown`)));
      request.end(body);
    });
  }
}
