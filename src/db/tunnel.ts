import * as fs from 'node:fs';
import * as path from 'node:path';
import * as net from 'node:net';
import { createTunnel } from 'tunnel-ssh';
import type { SSHConfig } from '../types/config.js';
import { ConnectionError } from '../utils/errors.js';

export interface TunnelResult {
  localPort: number;
  close: () => Promise<void>;
}

function resolvePath(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(process.env['HOME'] ?? '', filePath.slice(1));
  }
  return path.resolve(process.cwd(), filePath);
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close(() => resolve(addr.port));
    });
    srv.on('error', reject);
  });
}

export async function openSSHTunnel(
  ssh: SSHConfig,
  dbPort: number,
): Promise<TunnelResult> {
  const localPort = await getFreePort();

  // Use dbHostOnServer (how MySQL is reached from inside the server).
  // On most servers MySQL listens on 127.0.0.1 only, so the tunnel destination
  // must be 127.0.0.1 — NOT the server's external IP.
  const tunnelDstHost = ssh.dbHostOnServer ?? '127.0.0.1';

  const sshOptions: Record<string, unknown> = {
    host:     ssh.host,
    port:     ssh.port,
    username: ssh.username,
  };

  if (ssh.authMethod === 'password') {
    sshOptions['password'] = ssh.password;
  } else {
    const keyPath = resolvePath(ssh.privateKeyPath ?? '~/.ssh/id_rsa');
    if (!fs.existsSync(keyPath)) {
      throw new ConnectionError(`Private key not found at: ${keyPath}`);
    }
    sshOptions['privateKey'] = fs.readFileSync(keyPath);
    if (ssh.passphrase) {
      sshOptions['passphrase'] = ssh.passphrase;
    }
  }

  try {
    const [server] = await createTunnel(
      { autoClose: true, reconnectOnError: false },
      { host: '127.0.0.1', port: localPort },
      sshOptions,
      { srcAddr: '127.0.0.1', srcPort: localPort, dstAddr: tunnelDstHost, dstPort: dbPort },
    );

    return {
      localPort,
      close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ConnectionError(`SSH tunnel failed: ${msg}`);
  }
}
