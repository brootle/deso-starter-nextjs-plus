import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync('src/utils/contentModeration.js', 'utf8');
const { isBlockedUsername, filterBlockedContent } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
for (const name of ['MakerDAO', 'makerdao', '@MAKERDAO']) assert.equal(isBlockedUsername(name), true);
assert.equal(isBlockedUsername('another-user'), false);
assert.equal(filterBlockedContent({ Profile: { Username: 'MakerDAO' } }), null);
assert.deepEqual(filterBlockedContent({ ProfilesFound: [{ Username: 'MakerDAO' }, { Username: 'another-user' }] }), { ProfilesFound: [{ Username: 'another-user' }] });
assert.deepEqual(filterBlockedContent({ PostsFound: [{ Body: 'hidden', ProfileEntryResponse: { Username: 'MakerDAO' } }, { Body: 'visible' }] }).PostsFound, [{ Body: 'visible' }]);
assert.equal(filterBlockedContent({ PostFound: { ProfileEntryResponse: { Username: 'MakerDAO' } } }).PostFound, null);
assert.equal(filterBlockedContent({ ProfilesByPublicKey: { abc: { Username: 'MakerDAO' } } }).ProfilesByPublicKey.abc, null);
console.log('Moderation checks passed');
const middlewareSource = fs.readFileSync('src/middleware.js', 'utf8')
  .replace("import { NextResponse } from 'next/server';", 'const NextResponse = class extends Response { static next() { return { status: 200 }; } };')
  .replace("import { isBlockedUsername } from './utils/contentModeration';", source);
const { middleware } = await import('data:text/javascript;base64,' + Buffer.from(middlewareSource).toString('base64'));
for (const path of ['/MakerDAO', '/makerdao/posts', '/@MAKERDAO', '/%4dakerDAO', '/%40MakerDAO/posts/abc']) {
  const response = middleware({ nextUrl: { pathname: path } });
  assert.equal(response.status, 404, path);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
}
assert.equal(middleware({ nextUrl: { pathname: '/' } }).status, 200);
assert.equal(middleware({ nextUrl: { pathname: '/another-user' } }).status, 200);
console.log('Route checks passed');
