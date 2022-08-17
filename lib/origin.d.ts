/*
 * Copyright (c) 2022, Groupon, Inc.
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
