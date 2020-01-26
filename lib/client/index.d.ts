declare type IEventHandler = (msg?: any) => void;
export declare class Socket {
    private static readonly autoReconnectInterval;
    private static readonly longPollBreak;
    private static readonly longPollInterval;
    onClose: IEventHandler;
    onOpen: IEventHandler;
    onError: IEventHandler;
    onMessage: IEventHandler;
    onReconnect: IEventHandler;
    private readonly _host;
    private readonly _logger;
    private _tries;
    private _ws;
    private _connected;
    private readonly _channels;
    constructor(host: string, debug?: boolean);
    addChannel(name: string): boolean;
    removeChannel(name: string): boolean;
    clearChannels(): boolean;
    send(type: string, payload: any): void;
    sendChannel(channel: string, type: string, payload: any): void;
    private socketError;
    private socketOpen;
    private socketMessage;
    private socketClose;
    private reconnect;
}
export {};
