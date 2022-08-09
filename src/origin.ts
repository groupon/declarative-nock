import type { ParsedUrlQuery } from 'querystring';
import { URL } from 'url';

import Debug from 'debug';
import nock, { Interceptor } from 'nock';

// TODO: make this a deep merge
import { parseMethodPath, parseRequest } from './parse-request';

const debug = Debug('dnock:origin');

interface Headers {
  [name: string]: string;
}

export interface ResponseObj {
  statusCode?: number;
  body?: any;
  headers?: Headers;
}

export interface State {
  [prop: string]: any;
}

export interface RequestObj {
  params: { [name: string]: string };
  query: ParsedUrlQuery;
  body: string | object;
  state: State;
}

export type ReplyFn = (req: RequestObj) => ResponseObj | Promise<ResponseObj>;

export type Reply = ResponseObj | ReplyFn;

export interface Mocks {
  [methodPath: string]: Reply | Reply[];
}

type NockUrl = string | RegExp;

export interface OriginDecl {
  url: NockUrl;
  mocks: Mocks;
  prefix?: string | RegExp;
  state?: State;
  recordRequests?: boolean;
}

export interface OriginDecls {
  [originId: string]: OriginDecl;
}

export interface RequestReceivedObj {
  params: { [name: string]: string };
  query: ParsedUrlQuery;
  body: any;
  headers: Headers;
}

export type Interceptors = Map<Interceptor, string>;

export interface Route {
  received: RequestReceivedObj[];
  replies: Reply[];
  origReplies: Reply[];
}

export type Routes = Map<string, Route>;

const merge = Object.assign;

function convertResponse({
  statusCode,
  body,
  headers,
}: ResponseObj): [number, any, Headers] {
  return [statusCode || 200, body || {}, headers || {}];
}

function wrapMocks(mocks: { [s: string]: any }) {
  return Object.fromEntries(
    Object.entries(mocks).map(([route, fn]) => [
      route,
      typeof fn === 'function' ? fn : (): any => fn,
    ])
  );
}

export default class Origin {
  url: NockUrl;
  mocks: Mocks;
  scope?: nock.Scope;
  state: State;
  interceptors: Interceptors;
  routes: Routes;
  prefix?: string | RegExp;
  private defaultState: State;
  private recordRequests: boolean;

  constructor({
    url,
    mocks,
    prefix,
    state = {},
    recordRequests = true,
  }: OriginDecl) {
    if (prefix) {
      if (typeof prefix !== 'string' && !(prefix instanceof RegExp)) {
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `declarative-nock: prefix must be string or regexp; got: ${prefix}`
        );
      }
      this.prefix = prefix;
    }

    // nock has varying semantics around prefixes, so we'll normalize our inputs
    // to it: the url we pass it is *always* pathless (either regexp or string),
    // and any path will always be in the prefix that we use to create a regexp
    if (typeof url === 'string') {
      const u = new URL(url);

      if (prefix) {
        if (u.pathname !== '/') {
          throw new Error(
            'declarative-nock: cannot specify a prefix in both the url and the prefix'
          );
        }
      } else if (u.pathname !== '/') {
        this.prefix = u.pathname;
        u.pathname = '/';
        url = u.toString();
      }
    } else if (!(url instanceof RegExp)) {
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `declarative-nock: baseUrl must be string or regexp; got: ${url}`
      );
    }

    if (!mocks || typeof mocks !== 'object') {
      throw new Error(`declarative-nock: mocks must be an object`);
    }

    this.url = url;
    this.mocks = wrapMocks(mocks);
    this.defaultState = state;
    this.state = this.defaultState;
    this.recordRequests = recordRequests !== false;
    this.routes = new Map();
    this.interceptors = new Map();
  }

  installMocks() {
    this.scope = nock(this.url);
    this.scope.persist();

    for (const [methodPath, replies] of Object.entries(this.mocks)) {
      const [method, routePath, paramNames] = parseMethodPath(
        methodPath,
        this.prefix
      );
      const interceptor = this.scope[method](routePath);
      const repliesArr = Array.isArray(replies) ? [...replies] : [replies];
      const route = {
        replies: [...repliesArr],
        origReplies: repliesArr,
        received: [],
      };
      this.routes.set(methodPath, route);
      this.interceptors.set(interceptor, methodPath);
      interceptor
        .query(true)
        .reply(buildNockReplyFn(repliesArr, routePath, paramNames, this));
    }

    if (this.recordRequests) {
      this.scope.on('request', receiveListener.bind(null, this));
    }
  }

  resetReceived(): void {
    for (const [, route] of this.routes) route.received = [];
  }

  resetState(): void {
    this.state = this.defaultState;
  }

  resetMultiReplies(): void {
    for (const [, route] of this.routes) {
      route.replies.splice(0, Infinity, ...route.origReplies);
    }
  }

  resetAll(): void {
    this.resetReceived();
    this.resetState();
    this.resetMultiReplies();
  }

  setState(overrides: State): void {
    this.state = merge({}, this.state, overrides);
  }

  one(methodPath: string): RequestReceivedObj {
    if (!this.recordRequests) {
      throw new Error('.one() called with recordRequests: false');
    }

    const all = this.all(methodPath);

    if (all.length !== 1) {
      throw new Error(
        `Specified one request to ${methodPath}, but saw ${
          all.length
        }: ${JSON.stringify(all)}`
      );
    }

    return all[0];
  }

  all(methodPath: string): RequestReceivedObj[] {
    if (!this.recordRequests) {
      throw new Error('.all() called with recordRequests: false');
    }

    const route = this.routes.get(methodPath);
    if (!route) throw new Error(`missing route for ${methodPath}`);
    return route.received;
  }
}

function buildNockReplyFn(
  replies: Reply[],
  routePath: string | RegExp,
  paramNames: string[],
  origin: Origin
): (
  uri: string,
  body: string | object
) => Promise<[number, string | object, object]> {
  return async (uri, body) => {
    const [reply] = replies;
    if (replies.length > 1) replies.shift();
    if (typeof reply !== 'function') return convertResponse(reply);
    const { params, query } = parseRequest(uri, routePath, paramNames);
    const res = await reply({
      params,
      query,
      body,
      state: origin.state,
    });
    return convertResponse(res);
  };
}

function receiveListener(
  origin: Origin,
  req: import('http').IncomingMessage & import('http').ClientRequest,
  interceptor: Interceptor,
  body: string
) {
  const methodPath = origin.interceptors.get(interceptor);
  if (!methodPath) {
    throw new Error(`Got req for ${req.path} with no registered interceptor`);
  }
  debug(`received: ${methodPath}`);

  const [, routePath, paramNames] = parseMethodPath(methodPath, origin.prefix);
  const { params, query } = parseRequest(req.path, routePath, paramNames);
  const route = origin.routes.get(methodPath);
  if (!route) throw new Error(`missing route for ${methodPath}`);

  let decodedBody: any = body;
  if (body.length > 0) {
    const contentType = req.headers['content-type'];

    if (contentType && /^application\/json\b/.test(contentType)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      decodedBody = JSON.parse(body);
    }
  }

  route.received.push({
    params,
    query,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    body: decodedBody,
    headers: req.headers as Headers,
  });
}
