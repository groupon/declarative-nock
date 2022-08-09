'use strict';

const { Octokit } = require('@octokit/rest');
const { expect } = require('chai');

const { DeclarativeNock } = require('../');

const GET_LICENSE = 'get /repos/{owner}/{repo}/license';
const GIST = 'post /gists';

const dn = new DeclarativeNock({
  gh: {
    url: /^https:\/\/(api\.github\.com|github\.example\.com)/,
    prefix: /(?:\/api\/v3)?/,
    mocks: {
      [GET_LICENSE]: {
        body: {
          license: {
            key: 'mit',
            name: 'MIT License',
            spdx_id: 'MIT',
            url: 'https://api.github.com/licenses/mit',
            node_id: 'MDc6TGljZW5zZTEz',
          },
        },
      },

      [GIST]: () => ({
        statusCode: 201,
        body: { id: 'abc123' },
        headers: { Location: 'https://api.github.com/gists/abc123' },
      }),
    },
  },
});
const { gh } = dn.origins;

describe('test @octokit/rest & receiver api', () => {
  dn.addMochaHooks();

  it('fetches a license', async () => {
    const octo = new Octokit();
    expect(
      await octo.licenses.getForRepo({ owner: 'atom', repo: 'atom' })
    ).to.have.nested.property('data.license.key', 'mit');

    await octo.licenses.getForRepo({ owner: 'foo', repo: 'bar' });

    expect(gh.all(GET_LICENSE))
      .to.have.lengthOf(2)
      .and.have.nested.property('0.params.owner', 'atom');
  });

  it('creates a gist', async () => {
    const octo = new Octokit();
    await octo.gists.create({ files: { 'foo.txt': 'bar\n' } });
    expect(gh.one(GIST)).to.have.nested.property('body.files');
    expect(() => gh.one(GET_LICENSE)).to.throw('Specified one');
  });

  it('handles optional path component', async () => {
    const octo = new Octokit({ baseUrl: 'https://github.example.com/api/v3' });
    await octo.gists.create({ files: { 'foo.txt': 'bar\n' } });
    expect(gh.one(GIST)).to.have.nested.property('body.files');
  });
});
