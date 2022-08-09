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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclarativeNock = void 0;
const nock_1 = __importDefault(require("nock"));
const debug_1 = __importDefault(require("debug"));
const origin_1 = __importDefault(require("./origin"));
const debug = (0, debug_1.default)('dnock');
__exportStar(require("./origin"), exports);
class DeclarativeNock {
    constructor(originDecls) {
        this.nock = nock_1.default;
        this.origins = Object.fromEntries(Object.entries(originDecls).map(([id, decl]) => [id, new origin_1.default(decl)]));
    }
    installMocks() {
        for (const [id, origin] of Object.entries(this.origins)) {
            debug(`${id}: installMocks`);
            origin.installMocks();
        }
    }
    removeMocks() {
        debug('removeMocks');
        this.nock.cleanAll();
    }
    resetAll() {
        for (const [id, origin] of Object.entries(this.origins)) {
            debug(`${id}: resetAll`);
            origin.resetAll();
        }
    }
    addMochaHooks({ disableNetConnect = true, } = {}) {
        /* eslint-env mocha */
        before(() => {
            this.installMocks();
            if (disableNetConnect) {
                debug('disableNetConnect');
                this.nock.disableNetConnect();
            }
        });
        after(() => {
            this.removeMocks();
            if (disableNetConnect) {
                debug('enableNetConnect');
                this.nock.enableNetConnect();
            }
        });
        afterEach(() => this.resetAll());
    }
}
exports.DeclarativeNock = DeclarativeNock;
