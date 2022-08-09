// FIXME: use new URL()
// eslint-disable-next-line node/no-deprecated-api
import { parse as parseUrl } from 'url';
import type { ParsedUrlQuery } from 'querystring';

const HTTP_VERBS = ['get', 'post', 'put', 'head', 'patch', 'delete'] as const;
export type HttpVerb = typeof HTTP_VERBS[number];

const REGEXP_CHAR_RE = /[^\w\s@#%&=:;'",<>/-]/g;

function escapeRE(str: string) {
  return str.replace(REGEXP_CHAR_RE, '\\$&');
}

function checkMethod(method: string): method is HttpVerb {
  return HTTP_VERBS.includes(method as HttpVerb);
}

// these have already been through metachar escaping, which is why they're odd
const PARAM_RE = /\\?\{(\w+)\\?\}/g;
const TRAILING_WILD_RE = /\/\\\*$/;
export function parseMethodPath(
  methodPath: string,
  prefix: string | RegExp = '/'
): [HttpVerb, string | RegExp, string[]] {
  const [method, routePathIn] = methodPath.split(/\s+/);
  const paramNames: string[] = [];

  if (!checkMethod(method)) {
    throw new Error(`Unknown HTTP verb: ${method}`);
  }

  const prefixRE =
    typeof prefix === 'string'
      ? escapeRE(prefix.replace(/\/$/, ''))
      : prefix.source;
  const routePathRE = escapeRE(routePathIn)
    .replace(PARAM_RE, (x, name: string) => {
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

function extractParams(
  pathname: string,
  re: RegExp,
  paramNames: string[]
): { [name: string]: string } {
  const matches = pathname.match(re);
  if (!matches) {
    throw new Error(`failed to match ${pathname} with ${re.toString()}`);
  }
  return Object.fromEntries(
    matches.slice(1).map((value, i) => [paramNames[i], value])
  );
}

export function parseRequest(
  url: string,
  routePath: string | RegExp,
  paramNames: string[]
): { params: { [name: string]: string }; query: ParsedUrlQuery } {
  const { pathname, query } = parseUrl(url, true);
  const params =
    routePath instanceof RegExp
      ? extractParams(pathname || '/', routePath, paramNames)
      : {};
  return { query, params };
}
