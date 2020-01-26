"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const client_1 = require("./client");
const router_1 = require("./router");
class Manager {
    constructor(server, router, options) {
        const verifyFunc = options.verifyFunc ? options.verifyFunc : undefined;
        const connParser = options.connParser ? options.connParser : undefined;
        this._getClientName = options.getName
            ? options.getName
            : (sock, req) => req.headers["sec-websocket-key"];
        this._authChannelAdd = options.authChannelAdd
            ? options.authChannelAdd
            : () => true;
        this._cleanChannelsOnClose = !!options.cleanChannelsOnClose;
        this._logger = options.debug ? console.log : () => { };
        this._channels = new Map();
        this._router = new router_1.Router(this);
        this._pipeline = new Set();
        this.use(this._router.handler);
        this._clients = new Set();
        this._wss = new ws_1.default.Server({
            clientTracking: false,
            server,
            verifyClient: verifyFunc
        });
        router.use((req, res, next) => {
            req.sockets = this;
            next();
        });
        this.onConnection = this.onConnection.bind(this);
        this.handleClientMsg = this.handleClientMsg.bind(this);
        this.handleChannelMsg = this.handleChannelMsg.bind(this);
        this._wss.on("connection", (socket, req) => {
            let opts = {};
            if (connParser) {
                opts = connParser(socket, req);
            }
            this.onConnection(socket, req, opts);
        });
        this._wss.on("error", (err) => {
            console.log(`Error for underlying WS server:`);
            console.log(err);
        });
    }
    broadcast(type, payload = {}) {
        this._clients.forEach(client => {
            client.send(type, payload);
        });
    }
    get router() {
        return this._router;
    }
    use(handler) {
        this._pipeline.add(handler);
        return this;
    }
    sendChannel(channel, type, payload) {
        const chan = this._channels.get(channel);
        if (chan) {
            chan.forEach(client => {
                client.send(type, payload, channel);
            });
        }
    }
    onConnection(ws, req, options) {
        const name = this._getClientName(ws, req, options);
        this._logger(`Connection from: ${name}`);
        const client = new client_1.Client(ws, name, options);
        this._clients.add(client);
        ws.on("close", () => this.onClientClose(client));
        ws.on("message", (msg) => this.handleClientMsg(client, msg));
    }
    handleClientMsg(client, message) {
        try {
            const msg = JSON.parse(message);
            switch (msg.type) {
                case "@smgr:addChan":
                    this.onAddChannel(client, msg.payload.name);
                    break;
                case "@smgr:remChan":
                    this.onRemoveChannel(client, msg.payload.name);
                    break;
                default:
                    if (msg.chan) {
                        this.handleChannelMsg(client, msg.chan, msg.type, msg.payload);
                    }
                    else {
                        const handlers = this._pipeline.values().next();
                        const next = () => {
                            return {};
                        };
                        handlers.value(this, client, msg.type, msg.payload, next);
                        console.log(handlers);
                    }
            }
        }
        catch (err) {
            this._logger(`Error parsing JSON from client message: ${err}`);
        }
    }
    handleChannelMsg(client, chan, type, payload) {
        try {
            const channel = this._channels.get(chan);
            if (!channel) {
                return this._logger(`No such channel: ${chan}`);
            }
        }
        catch (err) {
            this._logger(err);
        }
    }
    onAddChannel(client, channel) {
        if (!this._authChannelAdd(client, channel)) {
            client.send("@sgmr:chanErr", { error: "unauthorized", channel });
            return;
        }
        if (this._channels.has(channel)) {
            const set = this._channels.get(channel);
            if (!set)
                return;
            set.add(client);
            this._logger(`Adding client to: ${channel} (${set.size})`);
            client.addChannel(channel);
        }
        else {
            this._logger(`Creating channel: ${channel} for ${client.name}`);
            const set = new Set();
            set.add(client);
            this._channels.set(channel, set);
        }
        client.send("@smgr:chanAdd", { name: channel });
    }
    onRemoveChannel(client, channel) {
        if (this._channels.has(channel)) {
            const set = this._channels.get(channel);
            if (!set)
                return;
            set.delete(client);
            this._logger(`Removing client from: ${channel} (${set.size})`);
            client.removeChannel(channel);
            if (set.size === 0) {
                this._channels.delete(channel);
            }
        }
        client.send("@smgr:chanRem", { name: channel });
    }
    onClientClose(client) {
        if (this._cleanChannelsOnClose) {
            const emptyChans = new Set();
            this._channels.forEach((sockets, chanName) => {
                sockets.delete(client);
                if (sockets.size === 0) {
                    emptyChans.add(chanName);
                }
            });
            for (const chan of emptyChans) {
                this._channels.delete(chan);
            }
            this._clients.delete(client);
        }
    }
}
exports.Manager = Manager;
