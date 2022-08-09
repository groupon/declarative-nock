"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRequest = exports.parseMethodPath = void 0;
// FIXME: use new URL()
// eslint-disable-next-line node/no-deprecated-api
const url_1 = require("url");
const HTTP_VERBS = ['get', 'post', 'put', 'head', 'patch', 'delete'];
const REGEXP_CHAR_RE = /[^\w\s@#%&=:;'",<>/-]/g;
function escapeRE(str) {
    return str.replace(REGEXP_CHAR_RE, '\\$&');
}
function checkMethod(method) {
    return HTTP_VERBS.includes(method);
}
// these have already been through metachar escaping, which is why they're odd
const PARAM_RE = /\\?\{(\w+)\\?\}/g;
const TRAILING_WILD_RE = /\/\\\*$/;
function parseMethodPath(methodPath, prefix = '/') {
    const [method, routePathIn] = methodPath.split(/\s+/);
    const paramNames = [];
    if (!checkMethod(method)) {
        throw new Error(`Unknown HTTP verb: ${method}`);
    }
    const prefixRE = typeof prefix === 'string'
        ? escapeRE(prefix.replace(/\/$/, ''))
        : prefix.source;
    const routePathRE = escapeRE(routePathIn)
        .replace(PARAM_RE, (x, name) => {
        paramNames.push(name);
        return '([^/]+)';
    })
        .replace(TRAILING_WILD_RE, '/([^?]+)');
    // semi-express-compatible storage of trailing wildcard, if present
    paramNames.push('0');
    return [
        method,
        new RegExp(`^${prefixRE}${routePathRE}(?:\\?|$)`),
        paramNames,
    ];
}
exports.parseMethodPath = parseMethodPath;
function extractParams(pathname, re, paramNames) {
    const matches = pathname.match(re);
    if (!matches) {
        throw new Error(`failed to match ${pathname} with ${re.toString()}`);
    }
    return Object.fromEntries(matches.slice(1).map((value, i) => [paramNames[i], value]));
}
function parseRequest(url, routePath, paramNames) {
    const { pathname, query } = (0, url_1.parse)(url, true);
    const params = routePath instanceof RegExp
        ? extractParams(pathname || '/', routePath, paramNames)
        : {};
    return { query, params };
}
exports.parseRequest = parseRequest;
