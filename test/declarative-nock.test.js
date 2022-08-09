'use strict';

const { expect } = require('chai');
const Gofer = require('gofer');

const { DeclarativeNock } = require('../');

const BASE_URL1 = 'http://one.example.com';
const BASE_URL2 = 'https://two.example.com/some/prefix';
const BASE_URL3_BASE = 'https://three.example.com';
const BASE_URL3_PREFIX = '/some/prefix';
const BASE_URL3 = BASE_URL3_BASE + BASE_URL3_PREFIX;
const BASE_URL45_RE = /^https:\/\/four\b|^http:\/\/five\b/;
const BASE_URL45_PREFIX_RE = /\/re(?:\/opt)?/;
const BINARY_STUFF = Buffer.from(
  'H4sIAPo1mVwAA8vOLClJzSsGAFOHR68HAAAA',
  'base64'
);

const client1 = new Gofer().with({ baseUrl: BASE_URL1 });
const client2 = new Gofer().with({ baseUrl: BASE_URL2 });
const client3 = new Gofer().with({ baseUrl: BASE_URL3 });
const client4 = new Gofer().with({ baseUrl: 'https://four.example.com/re' });
const client5 = new Gofer().with({ baseUrl: 'http://five.example.com/re/opt' });

const dn = new DeclarativeNock({
  one: {
    url: BASE_URL1,
    mocks: {
      'get /current': () => ({ body: { time: Date.now() } }),
      'get /minus-one/{n}': ({ params }) => ({
        body: { time: Number(params.n) - 1 },
      }),
      'put /sleep': async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {};
      },
      'get /search': ({ query }) => ({
        headers: { 'content-type': 'text/html' },
        body: `<!doctype html>\n<body>You XSSed for: <b>${query.q}</b></body>`,
      }),
      'get /static': { body: { token: 'static' } },
      'post /users/{id}': ({ params, body }) => ({
        statusCode: 204,
        headers: { 'x-id': params.id, 'x-body-token': body.token },
      }),
      'get /legacyMocks': () => ({ body: { legacyMocks: true } }),
      'get /legacyMocks2': { body: { legacyMocks: true } },
    },
  },
  two: {
    url: BASE_URL2,
    state: { statusCode: 201 },
    recordRequests: false,
    mocks: {
      'post /echo': ({ body, state: { statusCode } }) => ({ body, statusCode }),
    },
  },
  three: {
    url: BASE_URL3_BASE,
    prefix: BASE_URL3_PREFIX,
    mocks: { 'get /foo': {} },
  },
  regexps: {
    url: BASE_URL45_RE,
    prefix: BASE_URL45_PREFIX_RE,
    mocks: { 'get /foo': {} },
  },
});

describe('declarative-nock', () => {
  dn.addMochaHooks();

  it('respects state overrides', async () => {
    dn.origins.two.setState({ statusCode: 202 });
    expect(await client2.post('/echo')).to.have.property('statusCode', 202);
    expect(() => dn.origins.two.all('post /echo')).to.throw(
      'recordRequests: false'
    );
  });

  it('returns simple dynamic content', async () => {
    expect(await client1.get('/current').json())
      .to.have.property('time')
      .which.matches(/^\d+$/);
  });

  it('parses path params', async () => {
    expect(await client1.get('/minus-one/43').json()).to.have.property(
      'time',
      42
    );
  });

  it('handles async replies', async () => {
    const now = Date.now();
    expect(await client1.put('/sleep').json()).to.deep.equal({});
    expect(Date.now() - now).to.be.greaterThan(400);
  });

  it('parses query strings & accepts custom headers', async () => {
    const res = await client1.get('/search', { qs: { q: 'some cool search' } });
    expect(res.headers).to.deep.equal({ 'content-type': 'text/html' });
    expect(await res.text()).to.include('<b>some cool');
  });

  it('accepts a static reply', async () => {
    expect(await client1.get('/static').json()).to.deep.equal({
      token: 'static',
    });
  });

  it('can use legacy mocks', async () => {
    expect(await client1.get('/legacyMocks').json()).to.deep.equal({
      legacyMocks: true,
    });
    expect(await client1.get('/legacyMocks2').json()).to.deep.equal({
      legacyMocks: true,
    });
  });

  it('passes requestBody thru & accepts custom status code', async () => {
    const res = await client1.post('/users/42', { json: { token: 'toeken' } });
    expect(res.statusCode).to.equal(204);
    expect(res.headers).to.deep.equal({
      'content-type': 'application/json',
      'x-id': '42',
      'x-body-token': 'toeken',
    });
    expect(await res.json()).to.deep.equal({});
  });

  it('supplies binary bodies as hex', async () => {
    const res = await client2.post('/echo', {
      body: BINARY_STUFF,
      headers: 'application/octet-stream',
    });
    expect(res.statusCode).to.equal(201);
    expect(Buffer.from(await res.text(), 'hex').equals(BINARY_STUFF)).be.true;
  });

  it('handles string url + string prefix', async () => {
    const res = await client3.get('/foo');
    expect(res.statusCode).to.equal(200);
    await res.json();
  });

  it('handles regexp url + regexp prefix', async () => {
    const res4 = await client4.get('/foo');
    expect(res4.statusCode).to.equal(200);
    res4.json();

    const res5 = await client5.get('/foo');
    expect(res5.statusCode).to.equal(200);
    res5.json();
  });
});
