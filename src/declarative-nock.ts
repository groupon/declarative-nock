import nock from 'nock';
import Debug from 'debug';

import Origin, { OriginDecl } from './origin';

const debug = Debug('dnock');

export * from './origin';

export class DeclarativeNock {
  origins: { [id: string]: Origin };
  nock: typeof nock;

  constructor(originDecls: { [id: string]: OriginDecl }) {
    this.nock = nock;
    this.origins = Object.fromEntries(
      Object.entries(originDecls).map(([id, decl]) => [id, new Origin(decl)])
    );
  }

  installMocks(): void {
    for (const [id, origin] of Object.entries(this.origins)) {
      debug(`${id}: installMocks`);
      origin.installMocks();
    }
  }

  removeMocks(): void {
    debug('removeMocks');
    this.nock.cleanAll();
  }

  resetAll(): void {
    for (const [id, origin] of Object.entries(this.origins)) {
      debug(`${id}: resetAll`);
      origin.resetAll();
    }
  }

  addMochaHooks({
    disableNetConnect = true,
  }: { disableNetConnect?: boolean } = {}) {
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

  addJestHooks({
    disableNetConnect = true,
  }: { disableNetConnect?: boolean } = {}) {
    beforeAll(() => {
      this.installMocks();

      if (disableNetConnect) {
        debug('disableNetConnect');
        this.nock.disableNetConnect();
      }
    });
    afterAll(() => {
      this.removeMocks();

      if (disableNetConnect) {
        debug('enableNetConnect');
        this.nock.enableNetConnect();
      }
    });
    afterEach(() => this.resetAll());
  }
}
