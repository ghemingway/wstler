import WebSocket from "ws";
export declare class Client {
    get name(): string;
    get options(): any;
    private readonly _options;
    private readonly _ws;
    private readonly _name;
    private readonly _channels;
    constructor(socket: WebSocket, name: string, options?: any);
    send(type: string, payload: any, chan?: string): void;
    addChannel(name: string): Set<string>;
    removeChannel(name: string): boolean;
}
