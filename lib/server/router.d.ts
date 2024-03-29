import { Client } from "./client.js";
import { IHandler, Manager } from "./index.js";
export declare class Router {
    private readonly _handlers;
    private readonly _chanHanlders;
    private readonly _manager;
    constructor(manager: Manager);
    on(type: string, handler: IHandler): void;
    onChannel(channel: string, type: string, handler: IHandler): void;
    handler(manager: Manager, client: Client, type: string, payload: any, next: () => {}): void;
}
