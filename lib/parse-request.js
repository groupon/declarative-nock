/*
 * Copyright (c) 2022, David Bushong
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
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
