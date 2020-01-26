/* Copyright @author: G. Hemingway @2020 - All rights reserved */
"use strict";

import WebSocket from "ws";

type IEventHandler = (msg?: any) => void;

/* Class to handle details of each client on the server side */
export class Socket {
  // Default configuration values
  private static readonly autoReconnectInterval = 250;
  private static readonly longPollBreak = 20;
  private static readonly longPollInterval = 30000;
  // Public access methods - expect clients to overwrite
  public onClose: IEventHandler;
  public onOpen: IEventHandler;
  public onError: IEventHandler;
  public onMessage: IEventHandler;
  public onReconnect: IEventHandler;
  // Actual instance values
  private readonly _host: string;
  private readonly _logger: IEventHandler;
  private _tries: number;
  private _ws: WebSocket;
  private _connected: boolean;
  private readonly _channels: Set<string>;

  constructor(host: string, debug = false) {
    this._tries = 0;
    this._host = host;
    this._connected = false;
    this._channels = new Set();
    this._ws = new WebSocket(`ws://${this._host}`);
    this.socketOpen();
    // tslint:disable-next-line: no-empty
    this._logger = debug ? console.log : () => {};
    // Public event callback methods
    // tslint:disable-next-line: no-empty
    this.onClose = () => {};
    // tslint:disable-next-line: no-empty
    this.onOpen = () => {};
    // tslint:disable-next-line: no-empty
    this.onError = () => {};
    // tslint:disable-next-line: no-empty
    this.onMessage = () => {};
    // tslint:disable-next-line: no-empty
    this.onReconnect = () => {};
  }

  /*
   * Request to add a listening channel
   * @param name: string - channel to request being added to
   * @return: boolean - true if new, false if already a member
   */
  public addChannel(name: string): boolean {
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

  /*
   *
   */
  public removeChannel(name: string): boolean {
    if (this._channels.has(name)) {
      const data = JSON.stringify({
        payload: { name },
        type: "@smgr:remChan"
      });
      this._ws.send(data);
      return true;
    } else {
      return false;
    }
  }

  /*
   *
   */
  public clearChannels(): boolean {
    const entries = this._channels.entries();
    for (const name of entries) {
      this.removeChannel(name[0]);
    }
    return true;
  }

  /*
   *
   */
  public send(type: string, payload: any) {
    const data = JSON.stringify({ payload, type });
    this._ws.send(data);
  }

  /*
   *
   */
  public sendChannel(channel: string, type: string, payload: any) {
    const data = JSON.stringify({ payload, type: `@smgr:chan:${type}` });
    this._ws.send(data);
  }

  /*
   * Private internal event callback methods
   */
  private socketError(event: any) {
    this._logger(`Manager: ${this._tries}`);
    this.onError(event);
  }

  /*
   * Attempt to open a socket connection
   */
  private socketOpen() {
    this._ws.onerror = this.socketError.bind(this);
    this._ws.onopen = (ev: object) => {
      this._logger(`Manager: connection established`);
      this._tries = 0;
      // Only call open on first connection, call reconnect there after
      if (this._connected) {
        // Add socket back into all channels
        const channels = new Set(this._channels);
        this._channels.clear();
        channels.forEach(chan => this.addChannel(chan));
        this.onReconnect(ev);
      } else {
        this.onOpen(ev);
      }
      this._connected = true;
    };
    this._ws.onclose = this.socketClose.bind(this);
    this._ws.onmessage = this.socketMessage.bind(this);
  }

  /*
   * Handle channel messages locally, pass all others to client
   */
  private socketMessage(ev: any) {
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

  /*
   *
   */
  private socketClose(ev: any) {
    // Only reconnect on non-standard error
    if (ev.code !== 1000) {
      this.reconnect();
    } else {
      this._logger(`SocketManager: connection closed(${ev.code})`);
    }
    this.onClose();
  }

  /*
   *
   */
  private reconnect() {
    this._tries++;
    // Try frequently for a while, but then just poll once every 30 seconds
    const retryInterval =
      this._tries < Socket.longPollBreak
        ? this._tries * Socket.autoReconnectInterval
        : Socket.longPollInterval;
    this._logger(`SocketManager: retry in ${retryInterval}ms`);
    setTimeout(() => {
      this._ws = new WebSocket(`ws://${this._host}`);
      this.socketOpen();
    }, retryInterval);
  }
}
