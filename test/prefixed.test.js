'use strict';

const Gofer = require('gofer');
const { expect } = require('chai');

const { DeclarativeNock } = require('../');

const baseUrl = 'http://example.com/some/prefix';

const ONE = 'get /one';
const TWO = 'get /two/{id}';

const dn = new DeclarativeNock({
  x: { url: baseUrl, mocks: { [ONE]: {}, [TWO]: {} } },
});

const client = new Gofer().with({ baseUrl });

describe('prefixed urls', () => {
  dn.addMochaHooks();

  it('finds a string path mock', async () => {
    await client.fetch('/one');
    expect(dn.origins.x.one(ONE));
  });

  it('finds a regexp path mock', async () => {
    await client.fetch('/two/42');
    expect(dn.origins.x.one(TWO)).to.have.nested.property('params.id', '42');
  });
});
