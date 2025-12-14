import { client } from './sanity';

const token = process.env.SANITY_API_TOKEN;

export const writeClient = token
  ? client.withConfig({
      token,
      useCdn: false,
    })
  : null;
