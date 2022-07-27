"use strict";
export class Router {
    constructor(manager) {
        this._manager = manager;
        this._handlers = new Map();
        this._chanHanlders = new Map();
    }
    on(type, handler) {
        this._handlers.set(type, handler);
    }
    onChannel(channel, type, handler) {
        const chanMap = this._chanHanlders.get(channel);
        console.log(chanMap);
    }
    handler(manager, client, type, payload, next) {
        console.log(`In router default handler: ${this._manager}`);
        next();
    }
}
