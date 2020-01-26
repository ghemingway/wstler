/// <reference types="node" />
import express from "express";
import http from "http";
import { Client } from "./client";
import { Router } from "./router";
export declare type IHandler = (manager: Manager, client: Client, type: string, payload: any, next: () => {}) => void;
export declare class Manager {
    private readonly _authChannelAdd;
    private readonly _getClientName;
    private readonly _cleanChannelsOnClose;
    private readonly _logger;
    private readonly _wss;
    private readonly _channels;
    private readonly _clients;
    private readonly _pipeline;
    private readonly _router;
    constructor(server: http.Server, router: express.Router, options: any);
    broadcast(type: string, payload?: {}): void;
    get router(): Router;
    use(handler: IHandler): Manager;
    sendChannel(channel: string, type: string, payload: any): void;
    private onConnection;
    private handleClientMsg;
    private handleChannelMsg;
    private onAddChannel;
    private onRemoveChannel;
    private onClientClose;
}
