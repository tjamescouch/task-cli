import WebSocket from 'ws';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const AGENTCHAT_URL = process.env.AGENTCHAT_URL || 'wss://agentchat-server.fly.dev';
const IDENTITY_DIR = process.env.AGENTCHAT_IDENTITY_DIR || path.join(process.cwd(), '.agentchat', 'identities');

interface Identity {
  name: string;
  publicKey: string;
  secretKey: string;
}

interface ProposalParams {
  to: string;
  task: string;
  amount?: number;
  currency?: string;
  eloStake?: number;
  expires?: number;
}

export class AgentChatClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private connected = false;
  private agentId: string | null = null;
  private identity: Identity | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  async connect(identityName?: string): Promise<string> {
    if (identityName) {
      this.loadIdentity(identityName);
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(AGENTCHAT_URL);

        this.ws.on('open', () => {
          this.connected = true;
          // If we have identity, authenticate
          if (this.identity) {
            this.ws?.send(JSON.stringify({
              type: 'auth',
              publicKey: this.identity.publicKey,
            }));
          }
        });

        this.ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'welcome') {
            this.agentId = msg.agent_id;
            resolve(this.agentId!);
          }

          if (msg.type === 'error') {
            const pending = this.pendingRequests.get(msg.request_id);
            if (pending) {
              pending.reject(new Error(msg.message));
              this.pendingRequests.delete(msg.request_id);
            }
          }

          if (msg.type === 'proposal_sent' || msg.type === 'proposal_result') {
            const pending = this.pendingRequests.get(msg.request_id);
            if (pending) {
              pending.resolve(msg);
              this.pendingRequests.delete(msg.request_id);
            }
          }

          this.emit('message', msg);
        });

        this.ws.on('close', () => {
          this.connected = false;
          this.emit('close');
        });

        this.ws.on('error', (err) => {
          if (!this.connected) reject(err);
          this.emit('error', err);
        });

        // Timeout for connection
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (err) {
        reject(err);
      }
    });
  }

  private loadIdentity(name: string): void {
    const identityPath = path.join(IDENTITY_DIR, `${name}.json`);
    if (fs.existsSync(identityPath)) {
      this.identity = JSON.parse(fs.readFileSync(identityPath, 'utf-8'));
    }
  }

  async sendMessage(target: string, message: string): Promise<void> {
    if (!this.ws || !this.connected) {
      throw new Error('Not connected');
    }

    // First join the channel
    this.ws.send(JSON.stringify({
      type: 'join',
      channel: target,
    }));

    // Small delay to ensure join processes
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send the message
    this.ws.send(JSON.stringify({
      type: 'message',
      to: target,
      content: message,
    }));

    // Wait a bit for message to be sent before returning
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  async propose(params: ProposalParams): Promise<any> {
    if (!this.ws || !this.connected) {
      throw new Error('Not connected');
    }

    const requestId = uuidv4();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      this.ws!.send(JSON.stringify({
        type: 'propose',
        request_id: requestId,
        to: params.to,
        task: params.task,
        amount: params.amount,
        currency: params.currency || 'TEST',
        elo_stake: params.eloStake,
        expires: params.expires,
      }));

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Proposal timeout'));
        }
      }, 30000);
    });
  }

  getAgentId(): string | null {
    return this.agentId;
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

// Singleton for CLI usage
let client: AgentChatClient | null = null;

export async function getAgentChatClient(identityName?: string): Promise<AgentChatClient> {
  if (!client) {
    client = new AgentChatClient();
    await client.connect(identityName);
  }
  return client;
}

export function closeAgentChatClient(): void {
  if (client) {
    client.disconnect();
    client = null;
  }
}
