/**
 * PostgreSQL connection pool configuration with SSH tunnel
 *
 * Connects to PG databases via an SSH tunnel through a bastion host.
 * Manages connection pools for multiple PG databases on the same server.
 * Each database gets its own pool (PG pools are bound to a single database).
 *
 * Flow: Node → SSH tunnel (bastion) → PG server (internal OVH network)
 */

import fs from 'fs';
import net from 'net';
import pg from 'pg';
import { Client as SSHClient } from 'ssh2';

/** PG server connection (single server, multiple databases) */
const PG_HOST = 'main-postgres.engineering.shopopop.com';
const PG_PORT = 20184;
const PG_USER = process.env.POSTGRES_ENGINEERING_USER!;

/** SSH bastion to reach PG server (internal OVH network) */
const SSH_BASTION_HOST = 'bastion.engineering.shopopop.com';
const SSH_BASTION_USER = 'jean_michel_dolo';

/** Available PostgreSQL databases */
export const PG_DATABASES = {
  backoffice: 'api_backoffice_engineering_qa3',
  payment: 'service_payment_engineering_qa3',
  paymentQa: 'service_payment_engineering_qa',
  kyc: 'service_kyc_engineering_qa3',
  kycQa: 'service_kyc_engineering_qa',
} as const;

export type PGDatabaseKey = keyof typeof PG_DATABASES;

/** SSH tunnel state */
let sshClient: SSHClient | null = null;
let localServer: net.Server | null = null;
let tunnelPort: number | null = null;

/** Map of pools keyed by database name */
const pools: Map<string, pg.Pool> = new Map();

/**
 * Open an SSH tunnel to the PG server via the bastion
 * Creates a local TCP server that forwards connections through SSH
 *
 * @returns The local port to connect to
 */
export async function openSSHTunnel(): Promise<number> {
  if (tunnelPort) {
    return tunnelPort;
  }

  // SSH_BASTION_KEY can be either:
  // - a file path (local: /Users/jean-michel/.ssh/id_ed25519)
  // - the key content directly (CI: from GitHub Secret)
  const keyValue = process.env.SSH_BASTION_KEY || '';

  if (!keyValue) {
    throw new Error('Missing SSH_BASTION_KEY environment variable');
  }

  const privateKey = keyValue.startsWith('/') ? fs.readFileSync(keyValue) : keyValue;

  return new Promise((resolve, reject) => {
    const ssh = new SSHClient();
    sshClient = ssh;

    ssh.on('ready', () => {
      // Create a local TCP server that forwards to PG through SSH
      const server = net.createServer((localSocket) => {
        ssh.forwardOut(
          '127.0.0.1',
          0,
          PG_HOST,
          PG_PORT,
          (err, stream) => {
            if (err) {
              localSocket.destroy();
              return;
            }
            localSocket.pipe(stream).pipe(localSocket);
          }
        );
      });

      localServer = server;

      // Listen on a random available port
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as net.AddressInfo;
        tunnelPort = addr.port;
        resolve(tunnelPort);
      });

      server.on('error', reject);
    });

    ssh.on('error', reject);

    ssh.connect({
      host: SSH_BASTION_HOST,
      port: 22,
      username: SSH_BASTION_USER,
      privateKey,
    });
  });
}

/**
 * Connect to a specific PG database (lazy init: opens SSH tunnel on first call)
 *
 * @param database - Key from PG_DATABASES (e.g., 'backoffice', 'payment', 'kyc')
 * @returns pg.Pool instance ready to query
 */
export async function connectPG(database: PGDatabaseKey): Promise<pg.Pool> {
  if (!tunnelPort) {
    tunnelPort = await openSSHTunnel();
  }
  return getPGPool(database);
}

/**
 * Get or create a connection pool for a specific PG database
 * Requires tunnel to be open (use connectPG instead for auto-tunnel)
 *
 * @param database - Key from PG_DATABASES (e.g., 'backoffice', 'payment', 'kyc')
 * @returns pg.Pool instance
 */
function getPGPool(database: PGDatabaseKey): pg.Pool {
  const dbName = PG_DATABASES[database];

  if (!tunnelPort) {
    throw new Error('SSH tunnel not open. Call openSSHTunnel() first (in global-setup).');
  }

  if (!pools.has(dbName)) {
    pools.set(
      dbName,
      new pg.Pool({
        host: '127.0.0.1',
        port: tunnelPort,
        user: PG_USER,
        password: process.env.POSTGRES_ENGINEERING_PASSWORD || '',
        database: dbName,
        max: 1,
        connectionTimeoutMillis: 30000,
        ssl: { rejectUnauthorized: false },
      })
    );
  }

  return pools.get(dbName)!;
}

/**
 * Close a specific PG pool (keeps SSH tunnel open for reuse)
 *
 * @param database - Key from PG_DATABASES
 */
export async function disconnectPG(database: PGDatabaseKey): Promise<void> {
  const dbName = PG_DATABASES[database];
  const pool = pools.get(dbName);
  if (pool) {
    await pool.end();
    pools.delete(dbName);
  }
}

/**
 * Close all open PG pools (keeps SSH tunnel open for reuse)
 * Called by pg.fixture after each test
 */
export async function disconnectAllPG(): Promise<void> {
  for (const [, pool] of pools) {
    await pool.end();
  }
  pools.clear();
}

/**
 * Close all PG connection pools and SSH tunnel
 * Called in global-teardown after test campaign
 */
export async function closeAllPGPools(): Promise<void> {
  for (const [, pool] of pools) {
    await pool.end();
  }
  pools.clear();

  if (localServer) {
    localServer.close();
    localServer = null;
  }
  if (sshClient) {
    sshClient.end();
    sshClient = null;
  }
  tunnelPort = null;
}

/**
 * Check if a PG pool is still alive, refresh it if stale
 *
 * @param database - Key from PG_DATABASES
 */
export async function ensurePGConnection(database: PGDatabaseKey): Promise<void> {
  const pool = getPGPool(database);

  try {
    await pool.query('SELECT 1');
  } catch {
    console.log(`⚠️  PG connection stale for ${PG_DATABASES[database]}, refreshing pool...`);
    const dbName = PG_DATABASES[database];
    await pool.end().catch(() => {});
    pools.delete(dbName);
    getPGPool(database);
    console.log('✅ PG pool refreshed');
  }
}
