"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Client {
    constructor(socket, name, options) {
        this._ws = socket;
        this._name = name;
        this._channels = new Set();
        this._options = options;
    }
    get name() {
        return this._name;
    }
    get options() {
        return this._options;
    }
    send(type, payload, chan) {
        const data = JSON.stringify({
            chan,
            payload,
            type
        });
        this._ws.send(data);
    }
    addChannel(name) {
        return this._channels.add(name);
    }
    removeChannel(name) {
        return this._channels.delete(name);
    }
}
exports.Client = Client;
