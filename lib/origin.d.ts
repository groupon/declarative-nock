/// <reference types="node" />
import type { ParsedUrlQuery } from 'querystring';
import nock, { Interceptor } from 'nock';
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
    params: {
        [name: string]: string;
    };
    query: ParsedUrlQuery;
    body: string | object;
    state: State;
}
export declare type ReplyFn = (req: RequestObj) => ResponseObj | Promise<ResponseObj>;
export declare type Reply = ResponseObj | ReplyFn;
export interface Mocks {
    [methodPath: string]: Reply | Reply[];
}
declare type NockUrl = string | RegExp;
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
    params: {
        [name: string]: string;
    };
    query: ParsedUrlQuery;
    body: any;
    headers: Headers;
}
export declare type Interceptors = Map<Interceptor, string>;
export interface Route {
    received: RequestReceivedObj[];
    replies: Reply[];
    origReplies: Reply[];
}
export declare type Routes = Map<string, Route>;
export default class Origin {
    url: NockUrl;
    mocks: Mocks;
    scope?: nock.Scope;
    state: State;
    interceptors: Interceptors;
    routes: Routes;
    prefix?: string | RegExp;
    private defaultState;
    private recordRequests;
    constructor({ url, mocks, prefix, state, recordRequests, }: OriginDecl);
    installMocks(): void;
    resetReceived(): void;
    resetState(): void;
    resetMultiReplies(): void;
    resetAll(): void;
    setState(overrides: State): void;
    one(methodPath: string): RequestReceivedObj;
    all(methodPath: string): RequestReceivedObj[];
}
export {};
