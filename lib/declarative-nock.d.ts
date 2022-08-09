import nock from 'nock';
import Origin, { OriginDecl } from './origin';
export * from './origin';
export declare class DeclarativeNock {
    origins: {
        [id: string]: Origin;
    };
    nock: typeof nock;
    constructor(originDecls: {
        [id: string]: OriginDecl;
    });
    installMocks(): void;
    removeMocks(): void;
    resetAll(): void;
    addMochaHooks({ disableNetConnect, }?: {
        disableNetConnect?: boolean;
    }): void;
}
