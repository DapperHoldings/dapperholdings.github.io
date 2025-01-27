import { BskyAgent } from '@atproto/api';

const createAgent = () => new BskyAgent({
  service: 'https://bsky.social'
});

export const login = async (identifier: string, password: string) => {
  const agent = createAgent();
  try {
    await agent.login({ identifier, password });
    return {
      handle: agent.session?.handle,
      did: agent.session?.did,
      accessJwt: agent.session?.accessJwt,
      refreshJwt: agent.session?.refreshJwt
    };
  } catch (error) {
    console.error('Login error:', error);
    throw new Error('Login failed');
  }
};

export const getProfile = async (accessJwt: string, refreshJwt: string, did: string, handle: string) => {
  const agent = createAgent();
  try {
    await agent.resumeSession({
      accessJwt,
      refreshJwt,
      did,
      handle,
      active: true
    });

    // Get lists of blocks
    const { data } = await agent.app.bsky.graph.getBlocks();
    console.log('Fetched blocks from Bluesky:', data);
    return data;
  } catch (error) {
    console.error('Profile error:', error);
    throw new Error('Failed to get profile');
  }
};

export const blockAccount = async (accessJwt: string, refreshJwt: string, targetDid: string) => {
  const agent = createAgent();
  try {
    await agent.resumeSession({
      accessJwt,
      refreshJwt,
      did: agent.session?.did!,
      handle: agent.session?.handle!,
      active: true
    });

    const record = {
      subject: targetDid,
      createdAt: new Date().toISOString(),
    };

    return await agent.app.bsky.graph.block.create({ repo: agent.session?.did!, record });
  } catch (error) {
    console.error('Block error:', error);
    throw new Error('Failed to block account');
  }
};