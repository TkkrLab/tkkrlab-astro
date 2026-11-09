// GitHub sign-in for Sveltia CMS. Server-rendered because it holds the OAuth client secret.
// Handles /oauth/authorize and /oauth/redirect; anything else is a 404.
import authenticator from 'sveltia-cms-auth/src/index.js';

export const prerender = false;
export const GET = ({ request }) => authenticator.fetch(request, process.env);
