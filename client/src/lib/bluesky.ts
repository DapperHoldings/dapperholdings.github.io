import { BskyAgent } from '@atproto/api';

export const agent = new BskyAgent({
  service: 'https://bsky.social'
});

export async function loginWithBlueSky(): Promise<{
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
}> {
  try {
    // Get credentials from user input
    const identifier = window.prompt('Enter your handle') || '';
    const password = window.prompt('Enter your password') || '';

    // Validate input
    if (!identifier || !password) {
      throw new Error('Handle and password are required');
    }

    const { data } = await agent.login({
      identifier,
      password,
    });

    return {
      did: data.did,
      handle: data.handle,
      accessJwt: data.accessJwt,
      refreshJwt: data.refreshJwt,
    };
  } catch (error) {
    console.error('BlueSky login error:', error);
    throw new Error('Failed to login with BlueSky. Please check your credentials and try again.');
  }
}

export async function getBlockedAccounts(accessJwt: string) {
  try {
    // Create a new agent instance for this operation
    const agent = new BskyAgent({
      service: 'https://bsky.social'
    });

    await agent.resumeSession({
      accessJwt,
      did: '',
      handle: '',
      refreshJwt: '',
      email: '',
      emailConfirmed: false,
      active: true
    });

    let allBlocks = [];
    let cursor;

    // Fetch all blocks using pagination
    do {
      const response = await agent.api.app.bsky.graph.getBlocks({
        limit: 100,
        cursor,
      });

      if (response.success && response.data.blocks) {
        allBlocks = [...allBlocks, ...response.data.blocks];
        cursor = response.data.cursor;
      } else {
        throw new Error('Failed to fetch blocks from BlueSky');
      }
    } while (cursor);

    console.log("Total blocks fetched:", allBlocks.length);
    return allBlocks;
  } catch (error) {
    console.error('Fetch blocks error:', error);
    throw new Error('Failed to fetch blocked accounts. Please try logging in again.');
  }
}

export async function blockAccount(userDid: string, targetDid: string, accessJwt: string) {
  try {
    // Create a new agent instance for this operation
    const agent = new BskyAgent({
      service: 'https://bsky.social'
    });

    // Resume session with the provided access token
    await agent.resumeSession({
      accessJwt,
      did: userDid,
      handle: '',
      refreshJwt: '',
      email: '',
      emailConfirmed: false,
      active: true
    });

    // Use the graph API to block the account
    await agent.api.app.bsky.graph.block.create({
      repo: userDid,
      record: {
        subject: targetDid,
        createdAt: new Date().toISOString(),
        '$type': 'app.bsky.graph.block',
      },
    });

    console.log(`Successfully blocked account ${targetDid} for user ${userDid}`);
    return true;
  } catch (error: any) {
    console.error('Block account error:', error);
    throw new Error(`Failed to block account: ${error.message}`);
  }
}

export async function isAccountBlocked(did: string, accessJwt: string): Promise<boolean> {
  try {
    const agent = new BskyAgent({
      service: 'https://bsky.social'
    });

    await agent.resumeSession({
      accessJwt,
      did: '',
      handle: '',
      refreshJwt: '',
      email: '',
      emailConfirmed: false,
      active: true
    });

    const response = await agent.api.app.bsky.graph.getBlocks();
    return response.data.blocks.some(block => block.did === did);
  } catch (error) {
    console.error('Check block status error:', error);
    return false;
  }
}