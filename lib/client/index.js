"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
class Socket {
    constructor(host, debug = false) {
        this._tries = 0;
        this._host = host;
        this._connected = false;
        this._channels = new Set();
        this._ws = new ws_1.default(`ws://${this._host}`);
        this.socketOpen();
        this._logger = debug ? console.log : () => { };
        this.onClose = () => { };
        this.onOpen = () => { };
        this.onError = () => { };
        this.onMessage = () => { };
        this.onReconnect = () => { };
    }
    addChannel(name) {
        if (this._channels.has(name)) {
            return false;
        }
        const data = JSON.stringify({
            payload: { name },
            type: "@smgr:addChan"
        });
        this._ws.send(data);
        return true;
    }
    removeChannel(name) {
        if (this._channels.has(name)) {
            const data = JSON.stringify({
                payload: { name },
                type: "@smgr:remChan"
            });
            this._ws.send(data);
            return true;
        }
        else {
            return false;
        }
    }
    clearChannels() {
        const entries = this._channels.entries();
        for (const name of entries) {
            this.removeChannel(name[0]);
        }
        return true;
    }
    send(type, payload) {
        const data = JSON.stringify({ payload, type });
        this._ws.send(data);
    }
    sendChannel(channel, type, payload) {
        const data = JSON.stringify({ payload, type: `@smgr:chan:${type}` });
        this._ws.send(data);
    }
    socketError(event) {
        this._logger(`Manager: ${this._tries}`);
        this.onError(event);
    }
    socketOpen() {
        this._ws.onerror = this.socketError.bind(this);
        this._ws.onopen = (ev) => {
            this._logger(`Manager: connection established`);
            this._tries = 0;
            if (this._connected) {
                const channels = new Set(this._channels);
                this._channels.clear();
                channels.forEach(chan => this.addChannel(chan));
                this.onReconnect(ev);
            }
            else {
                this.onOpen(ev);
            }
            this._connected = true;
        };
        this._ws.onclose = this.socketClose.bind(this);
        this._ws.onmessage = this.socketMessage.bind(this);
    }
    socketMessage(ev) {
        const message = JSON.parse(ev.data);
        switch (message.type) {
            case "@smgr:chanAdd":
                console.log(`SocketClient::chanAdd - ${message.payload.name}`);
                this._channels.add(message.payload.name);
                break;
            case "@smgr:chanRem":
                console.log(`SocketClient::chanRem - ${message.payload.name}`);
                this._channels.delete(message.payload.name);
                break;
            default:
                this.onMessage(message);
        }
    }
    socketClose(ev) {
        if (ev.code !== 1000) {
            this.reconnect();
        }
        else {
            this._logger(`SocketManager: connection closed(${ev.code})`);
        }
        this.onClose();
    }
    reconnect() {
        this._tries++;
        const retryInterval = this._tries < Socket.longPollBreak
            ? this._tries * Socket.autoReconnectInterval
            : Socket.longPollInterval;
        this._logger(`SocketManager: retry in ${retryInterval}ms`);
        setTimeout(() => {
            this._ws = new ws_1.default(`ws://${this._host}`);
            this.socketOpen();
        }, retryInterval);
    }
}
exports.Socket = Socket;
Socket.autoReconnectInterval = 250;
Socket.longPollBreak = 20;
Socket.longPollInterval = 30000;
