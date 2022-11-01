[![nlm-github](https://img.shields.io/badge/github-groupon%2Fdeclarative--nock%2Fissues-F4D03F?logo=github&logoColor=white)](https://github.com/groupon/declarative-nock/issues)
![nlm-node](https://img.shields.io/badge/node-%3E%3D12-blue?logo=node.js&logoColor=white)
![nlm-version](https://img.shields.io/badge/version-1.0.1-blue?logo=version&logoColor=white)
# `declarative-nock`

An opinionated package to provide an easier-to-use declarative syntax in
front of [nock][nock], allowing OpenAPI-like syntax for the route paths.

[nock]: https://github.com/nock/nock

## Install
```bash
npm i declarative-nock
```

## Example

```ts
const { DeclarativeNock } = require('declarative-nock');
const { expect } = require('chai');
const client = require('@example/some-client');

const GET_PET = 'get /v2/pet/{petId}';
const ADD_PET = 'post /v2/pet/{petId}';
const GIST = 'post /gist';

const dn = new DeclarativeNock({
  petStore: {
    url: 'https://petstore.swagger.io',
    state: { petName: 'Fluffers' },
    mocks: {
      [GET_PET]: ({ state: { petName: name }, params: { id } }) => ({
        body: { id, name }
      }),
      [ADD_PET]: [
        { statusCode: 500 },
        { body: { id: 42 } }
      ]
    },
  },
  github: {
    url: 'https://api.github.com',
    state: { gistStatus: 201 },
    mocks: {
      [GIST]: ({ state: { gistStatus: statusCode } }) => ({
        statusCode,
        body: { id: 'abc123' },
        headers: { Location: 'https://api.github.com/gists/abc123' },
      }),
    }
  }
});
const { github, petStore } = dn.origins;

describe('the tests', () => {
  dn.addMochaHooks();

  it('makes a gist for the default name successfully', async () => {
    await client.uploadGistOfRandomPet();

    expect(github.one(GIST))
      .to.have.nested.property('body.files.pet', 'Fluffers');
    expect(petStore.all(GET_PET)).to.have.lengthOf(1);
  });

  it('fails for a bad name', async () => {
    petStore.setState({ petName: 'Grumpers' });
    github.setState({ gistStatus: 500 });

    await expect(client.uploadGistOfRandomPet())
      .to.eventually.be.rejectedWith('Got 500 for Grumpers');
  });

  it('retries on 500 adding a pet', async () => {
    await client.addPet('Kirby');

    expect(petStore.all(ADD_PET)).to.have.lengthOf(2);
  })
});
```

## API

### `class DeclarativeNock`

```ts
class DeclarativeNock {
  constructor(originDecl: { [originId: string]: OriginDecl });
  origins: { [originId: string]: Origin };
  nock: Nock;
  installMocks(): void;
  removeMocks(): void;
  resetAll(): void;
  addMochaHooks(opts?: { disableNetConnect: boolean = true }): void;
  addJestHooks(opts?: { disableNetConnect: boolean = true }): void;
}
```

The main external interface to declarative-nock is the `DeclarativeNock` class,
whose constructor takes your declared mocks for one or more origins, and
returns a DeclarativeNock instance to manage your mocks.  Note that this does
**not** install the http interceptors until you call `.installMocks()`

#### `origins`

All the origin-specific methods and data, keyed by the same `originId` you
chose when you gave the origin declarations in the constructor.

#### `installMocks()`

Installs the nock interceptors: you often only want to do this when the test
suite starts, so that `require()`ing your test file doesn't have side effects.

#### `removeMocks()`

The same as calling `.nock.cleanAll()` - removes **ALL** registered
interceptors, not just those registered in this call.

#### `resetAll()`

Is the equivalent of resetting all state to its initial starting conditions,
including:

* forgets about all received requests (`.resetReceived()`)
* resets multi-reply sections to their first (`.resetMultiReplies()`)
* Undo overrides added with `.setState()` (`.resetState()`)

#### `addMochaHooks({ disableNetConnect = true })`

Makes the following calls for mocha-compatible convenience to be called inside
a `describe()`:

```js
before(() => dn.installMocks());
after(() => dn.removeMocks());
afterEach(() => dn.resetAll());
```

Additionally, if the `disableNetConnect` option is `true` (the default),
then the `before()/after()` will disable and re-enable net connect using
`.nock.disable/enableNetConnect()` for you.  If you don't wish this behavior,
set `disableNetConnect: false`.

#### `addJestHooks({ disableNetConnect = true })`

Exactly like `addMochaHooks()` except calls `beforeAll()` and `afterAll()`
instead of `before()` and `after()` to work with Jest.

#### `nock`

A reference to `require('nock')` so you don't have to explicitly include it as
a dependency; useful for things like `nock.restore/active()`,
`nock.disable/enableNetConnect()`, and `nock.cleanAll()`  (Though many of
these are handled for you by `.addMochaHooks()`)

### `class Origin`

```ts
class Origin {
  scope?: Nock.Scope;
  setState(overrides: object): void;
  one?(methodPath: string): RequestObj;
  all?(methodPath: string): RequestObj[];
  resetReceived(): void;
  resetMultiReplies(): void;
  resetState(): void;
};
```

#### `setState(object)`

Sets override to the default state given as `state: { ... }` in the
`OriginDecl`. This is useful for supplying some "backchannel" changes to a mock
for testing alternative behavior.  The changes given will be shallow-merged onto
the state defaults.

#### `one(methodPath)`

Will assert that, since the last `resetState/All()` call, exactly one request to
the given endpoint was received, and returns its `RequestObj` (including
headers).

(Will not exist if `recordRequests: false` was set in the `OriginDecl`)

#### `all(methodPath)`

Returns an array of the zero or more requests to the given endpoint since the
last reset.

(Will not exist if `recordRequests: false` was set in the `OriginDecl`)

#### `resetReceived()`

Will make `.all()` for all method paths return `[]` again.

#### `resetState()`

Erase overrides added by `.setState()`

#### `resetMultiReplies()`

If you supplied an array for `Reply`, and requests have been made to it,
this will reset it to using the first reply again.

#### `scope`

A reference to the nock scope returned by invoking `nock()` for you - only
exists once you have called `.installMocks()`

## Types

### OriginDecl
```ts
type OriginDecl = { 
  url: string | RegExp, 
  mocks: Mocks, 
  prefix?: string | RegExp, 
  state?: object, 
  recordRequests?: boolean 
}
```

#### url
Url for the host to mock, per [specifying hostname](https://github.com/nock/nock#specifying-hostname) in the nocks docs.

#### mocks
The actual declared mocks for this origin.

#### prefix
An optional prefix - if your `url` is a string, you may simply append this to
the URL instead, e.g.: `https://myhost.example.com/some/prefix`.  If your `url`
is a `RegExp`, however, or you wish for this prefix itself to be a `RegExp`,
you can specify it here.  For example, to handle public & internal GitHub
with the same `mocks`, you could do:

```js
{
  url: /^https:\/\/(?:api\.github\.com|github\.example\.com)/,
  prefix: /(?:\/api\/v3)?/, // optional prefix for the internal server
  // ...
}
```
#### state
If given, defaults for the `state` property which will be available in dynamic
`Reply` functions - intended to be overridden using `.setState()`.

#### recordRequests
Whether received requests should be recorded to validate in your tests -
defaults to `true`.  If you have a particularly busy API that would use up
too much memory to record this during a run, you can disable this.

### RequestObj
```ts
type RequestObj = { 
  params: PathParams, 
  query: QueryArgs, 
  body: string | object, 
  headers?: Headers, 
  state?: object 
}
```

The `RequestObj` is used in two contexts:

When passed to a dynamic mock `Reply` function, it will not have `headers`,
a `state` object containing any test state vars with their overrides will be
available, and the `body` will be either a string or, if the `Content-Type`
header appears to be JSON, an object decoded from the JSON.

When checked after the request is made using `.reqs.one/all()`, `headers` will
also be available.

### Mocks
```ts
type Mocks = { [methodPath: string]: Reply | Reply[] }
```

The mocks object you pass has as its properties strings of the form:
`"${method} ${routePath}"`, where `method` is one of: `get`, `post`, etc., and
`routePath` is an [OpenAPI-compatible path][open-api-path].  Examples are
`get /` or `post /some/{id}`

One variance is that you may include exactly one final path component like
`/*` which will place all remaining path components into `params[0]`, similar
to the express behavior with named path params.  See the `PathParams` docs
below.

[open-api-path]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#path-templating-matching

If the reply is an array, then the multiple replies will be used in the
following manner:

1. Each request will use the next reply in the list
1. If more requests and available replies are made, the last available Reply
    will be re-used

If you wish to have more-requests-than-replies to be an error condition,
just do something like:

```js
{
  'get /only-two': [
    { body: { id: 'first' } },
    { body: { id: 'second' } },
    () => {
      throw new Error('Should only have received 2 requests');
    }
  ]
}
```

### Reply
```ts
type Reply = ResponseObj | (RequestObj) => ResponseObj|Promise<ResponseObj>
```

OK, so that's a big type sig for `Reply` - let's break down the options:

1. Just a `ResponseObj` - this is statically returned every time
1. A function which receives as arguments descriptive details of the attempted
    request, and should return either a `ResponseObj` or a Promise for one.
    The `body` will NOT be decoded (JSON will be a JSON string, e.g.), and
    binary request bodies will be a hex-encoded string, which can be decoded
    with `Buffer.from(body, 'hex')`

### ResponseObj
```ts
type ResponseObj = { 
  statusCode?: number, 
  headers?: Headers, 
  body?: ResponseBody 
}
```
* `statusCode`: defaults to 200
* `headers`: for defaults see below
* `body`: defaults to `''`

### PathParams
```ts
type PathParams = { [param: string]: string }
```

For each `{param}` section present in the path, the supplied value will be
be available here, so e.g. `get /info/{user}/{id}`, if requested as
`GET /info/arthur/42` would produce `{ params: { user: 'arthur', id: '42' } }`

The single wildcard will place its string into `[0]`, so e.g.:
`get /{id}/contents/*` with a request of `GET /42/contents/x/y/z` would produce:
`{ params: { id: '42', '0': 'x/y/z' } }`

### QueryArgs
```ts
type QueryArgs = { [arg: string]: string | string[] }
```

The query section of the requested URI, if present, will be converted into an
object by using the builtin `querystring` library.

### Headers
```ts
type Headers = { [headerName: string]: string }
```

Any response headers to send.  `Content-Type` will default to `application/json`

### ResponseBody
```ts
type ResponseBody = object | string | Buffer
```

* If the response body is an object, it will be JSON encoded.
* If the response body is a string or Buffer it will be sent as-is
