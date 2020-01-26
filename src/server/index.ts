/* Copyright @author: G. Hemingway @2020 - All rights reserved */
"use strict";

import express from "express";
import http from "http";
import WebSocket from "ws";
import { Client } from "./client";
import { Router } from "./router";

interface IMsg {
  type: string;
  payload: any;
  chan?: string;
}

export type IHandler = (
  manager: Manager,
  client: Client,
  type: string,
  payload: any,
  next: () => {}
) => void;

export class Manager {
  private readonly _authChannelAdd: any;
  private readonly _getClientName: any;
  private readonly _cleanChannelsOnClose: boolean;
  private readonly _logger: any;
  private readonly _wss: WebSocket.Server;
  private readonly _channels: Map<string, Set<Client>>;
  private readonly _clients: Set<Client>;
  private readonly _pipeline: Set<IHandler>;
  private readonly _router: Router;

  constructor(server: http.Server, router: express.Router, options: any) {
    const verifyFunc = options.verifyFunc ? options.verifyFunc : undefined;
    const connParser = options.connParser ? options.connParser : undefined;
    this._getClientName = options.getName
      ? options.getName
      : (sock: WebSocket, req: any) => req.headers["sec-websocket-key"];
    // Setup channel add authentication
    this._authChannelAdd = options.authChannelAdd
      ? options.authChannelAdd
      : () => true;
    this._cleanChannelsOnClose = !!options.cleanChannelsOnClose;
    // tslint:disable-next-line: no-empty
    this._logger = options.debug ? console.log : () => {};
    this._channels = new Map();
    this._router = new Router(this);
    // Initialize the base pipeline and add the default router
    this._pipeline = new Set();
    this.use(this._router.handler);
    // Init set of clients
    this._clients = new Set();
    // Establish the underlying Websocket server
    this._wss = new WebSocket.Server({
      clientTracking: false,
      server,
      verifyClient: verifyFunc
    });
    // Hook into the router's pipeline
    router.use((req: any, res: any, next: any) => {
      req.sockets = this;
      next();
    });
    // Bind local functions
    this.onConnection = this.onConnection.bind(this);
    this.handleClientMsg = this.handleClientMsg.bind(this);
    this.handleChannelMsg = this.handleChannelMsg.bind(this);
    // Capture events from Websocket.Server
    // this._wss.on("close", () => {});
    // Process the connection with a passed parser (if any)
    this._wss.on("connection", (socket, req) => {
      let opts = {};
      if (connParser) {
        opts = connParser(socket, req);
      }
      this.onConnection(socket, req, opts);
    });
    this._wss.on("error", (err: any) => {
      console.log(`Error for underlying WS server:`);
      console.log(err);
    });
    // this._wss.on("headers", (headers, req) => {});
    // this._wss.on("listening", () => {});
  }

  /*
   * Public functions
   */
  public broadcast(type: string, payload = {}) {
    this._clients.forEach(client => {
      client.send(type, payload);
    });
  }

  /*
   *
   */
  public get router() {
    return this._router;
  }

  /*
   *
   */
  public use(handler: IHandler): Manager {
    this._pipeline.add(handler);
    return this;
  }

  /*
   * Broadcast message to a channel
   */
  public sendChannel(channel: string, type: string, payload: any) {
    // Does the channel exist
    const chan = this._channels.get(channel);
    if (chan) {
      // Iterate over all clients in channel
      chan.forEach(client => {
        // Broadcast to client
        client.send(type, payload, channel);
      });
    }
  }

  /*
   * Handle new client connections
   */
  private onConnection(ws: WebSocket, req: any, options?: any) {
    // Determine socket name (may call user-defined getName function)
    const name = this._getClientName(ws, req, options);
    this._logger(`Connection from: ${name}`);
    // Add into global list of clients
    const client = new Client(ws, name, options);
    this._clients.add(client);
    // Bind event handlers for this client
    ws.on("close", () => this.onClientClose(client));
    // ws.on("error", () => {});
    ws.on("message", (msg: string) => this.handleClientMsg(client, msg));
    // ws.on("open", () => {});
    // ws.on("ping", () => {});
    // ws.on("pong", () => {});
    // ws.on("unexpected-response", () => {});
    // ws.on("upgrade", () => {});
  }

  /*
   * Handle message from client.  Need to filter out system messages - type will start with @smgr
   */
  private handleClientMsg(client: Client, message: string) {
    try {
      const msg: IMsg = JSON.parse(message);
      // Check for special messages
      switch (msg.type) {
        case "@smgr:addChan":
          this.onAddChannel(client, msg.payload.name);
          break;
        case "@smgr:remChan":
          this.onRemoveChannel(client, msg.payload.name);
          break;
        default:
          // Is there a channel
          if (msg.chan) {
            // Pass message through channel pipeline
            this.handleChannelMsg(client, msg.chan, msg.type, msg.payload);
          } else {
            // Pass message through pipeline
            // TODO: This is horribly broken
            const handlers = this._pipeline.values().next();
            const next = () => {
              // handlers = handlers.next();
              return {};
            };
            handlers.value(this, client, msg.type, msg.payload, next);
            console.log(handlers);
          }
      }
    } catch (err) {
      this._logger(`Error parsing JSON from client message: ${err}`);
    }
  }

  /*
   *
   */
  private handleChannelMsg(
    client: Client,
    chan: string,
    type: string,
    payload: any
  ) {
    try {
      const channel = this._channels.get(chan);
      if (!channel) {
        return this._logger(`No such channel: ${chan}`);
      }
      // Issue message through pipeline
    } catch (err) {
      this._logger(err);
    }
  }

  /*
   * Handle client request to be added to a channel
   */
  private onAddChannel(client: Client, channel: string) {
    // Is client allowed to join
    if (!this._authChannelAdd(client, channel)) {
      client.send("@sgmr:chanErr", { error: "unauthorized", channel });
      return;
    }
    // Does the channel already exist
    if (this._channels.has(channel)) {
      // Add client to channel
      const set = this._channels.get(channel);
      if (!set) return;
      set.add(client);
      this._logger(`Adding client to: ${channel} (${set.size})`);
      // Add channel to client
      client.addChannel(channel);
    } else {
      this._logger(`Creating channel: ${channel} for ${client.name}`);
      const set = new Set<Client>();
      set.add(client);
      this._channels.set(channel, set);
    }
    // Notify client they have been added
    client.send("@smgr:chanAdd", { name: channel });
  }

  /*
   * Handle client request to be removed from a channel
   */
  private onRemoveChannel(client: Client, channel: string) {
    // Does the channel already exist
    if (this._channels.has(channel)) {
      // Remove client from channel
      const set = this._channels.get(channel);
      if (!set) return;
      set.delete(client);
      this._logger(`Removing client from: ${channel} (${set.size})`);
      // Remove channel from client
      client.removeChannel(channel);
      // Clean empty channels
      if (set.size === 0) {
        this._channels.delete(channel);
      }
    }
    // Notify client they have been removed
    client.send("@smgr:chanRem", { name: channel });
  }

  /*
   * Handle client closing connection
   */
  private onClientClose(client: Client) {
    if (this._cleanChannelsOnClose) {
      const emptyChans = new Set<string>();
      // Remove client from all channels
      this._channels.forEach((sockets, chanName) => {
        sockets.delete(client);
        // Track if channel should be deleted once all clients are gone
        if (sockets.size === 0) {
          emptyChans.add(chanName);
        }
      });
      for (const chan of emptyChans) {
        this._channels.delete(chan);
      }
      // Remove from list of clients
      this._clients.delete(client);
    }
  }
}
