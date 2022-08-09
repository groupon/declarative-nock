/// <reference types="node" />
import type { ParsedUrlQuery } from 'querystring';
declare const HTTP_VERBS: readonly ["get", "post", "put", "head", "patch", "delete"];
export declare type HttpVerb = typeof HTTP_VERBS[number];
export declare function parseMethodPath(methodPath: string, prefix?: string | RegExp): [HttpVerb, string | RegExp, string[]];
export declare function parseRequest(url: string, routePath: string | RegExp, paramNames: string[]): {
    params: {
        [name: string]: string;
    };
    query: ParsedUrlQuery;
};
export {};
