"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const debug_1 = __importDefault(require("debug"));
const nock_1 = __importDefault(require("nock"));
// TODO: make this a deep merge
const parse_request_1 = require("./parse-request");
const debug = (0, debug_1.default)('dnock:origin');
const merge = Object.assign;
function convertResponse({ statusCode, body, headers, }) {
    return [statusCode || 200, body || {}, headers || {}];
}
function wrapMocks(mocks) {
    return Object.fromEntries(Object.entries(mocks).map(([route, fn]) => [
        route,
        typeof fn === 'function' ? fn : () => fn,
    ]));
}
class Origin {
    constructor({ url, mocks, prefix, state = {}, recordRequests = true, }) {
        if (prefix) {
            if (typeof prefix !== 'string' && !(prefix instanceof RegExp)) {
                throw new Error(
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                `declarative-nock: prefix must be string or regexp; got: ${prefix}`);
            }
            this.prefix = prefix;
        }
        // nock has varying semantics around prefixes, so we'll normalize our inputs
        // to it: the url we pass it is *always* pathless (either regexp or string),
        // and any path will always be in the prefix that we use to create a regexp
        if (typeof url === 'string') {
            const u = new url_1.URL(url);
            if (prefix) {
                if (u.pathname !== '/') {
                    throw new Error('declarative-nock: cannot specify a prefix in both the url and the prefix');
                }
            }
            else if (u.pathname !== '/') {
                this.prefix = u.pathname;
                u.pathname = '/';
                url = u.toString();
            }
        }
        else if (!(url instanceof RegExp)) {
            throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `declarative-nock: baseUrl must be string or regexp; got: ${url}`);
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
        this.scope = (0, nock_1.default)(this.url);
        this.scope.persist();
        for (const [methodPath, replies] of Object.entries(this.mocks)) {
            const [method, routePath, paramNames] = (0, parse_request_1.parseMethodPath)(methodPath, this.prefix);
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
    resetReceived() {
        for (const [, route] of this.routes)
            route.received = [];
    }
    resetState() {
        this.state = this.defaultState;
    }
    resetMultiReplies() {
        for (const [, route] of this.routes) {
            route.replies.splice(0, Infinity, ...route.origReplies);
        }
    }
    resetAll() {
        this.resetReceived();
        this.resetState();
        this.resetMultiReplies();
    }
    setState(overrides) {
        this.state = merge({}, this.state, overrides);
    }
    one(methodPath) {
        if (!this.recordRequests) {
            throw new Error('.one() called with recordRequests: false');
        }
        const all = this.all(methodPath);
        if (all.length !== 1) {
            throw new Error(`Specified one request to ${methodPath}, but saw ${all.length}: ${JSON.stringify(all)}`);
        }
        return all[0];
    }
    all(methodPath) {
        if (!this.recordRequests) {
            throw new Error('.all() called with recordRequests: false');
        }
        const route = this.routes.get(methodPath);
        if (!route)
            throw new Error(`missing route for ${methodPath}`);
        return route.received;
    }
}
exports.default = Origin;
function buildNockReplyFn(replies, routePath, paramNames, origin) {
    return async (uri, body) => {
        const [reply] = replies;
        if (replies.length > 1)
            replies.shift();
        if (typeof reply !== 'function')
            return convertResponse(reply);
        const { params, query } = (0, parse_request_1.parseRequest)(uri, routePath, paramNames);
        const res = await reply({
            params,
            query,
            body,
            state: origin.state,
        });
        return convertResponse(res);
    };
}
function receiveListener(origin, req, interceptor, body) {
    const methodPath = origin.interceptors.get(interceptor);
    if (!methodPath) {
        throw new Error(`Got req for ${req.path} with no registered interceptor`);
    }
    debug(`received: ${methodPath}`);
    const [, routePath, paramNames] = (0, parse_request_1.parseMethodPath)(methodPath, origin.prefix);
    const { params, query } = (0, parse_request_1.parseRequest)(req.path, routePath, paramNames);
    const route = origin.routes.get(methodPath);
    if (!route)
        throw new Error(`missing route for ${methodPath}`);
    let decodedBody = body;
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
        headers: req.headers,
    });
}
