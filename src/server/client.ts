/* Copyright @author: G. Hemingway @2022 - All rights reserved */
"use strict";

import WebSocket from "ws";

export class Client {
  get name(): string {
    return this._name;
  }
  get options(): any {
    return this._options;
  }
  private readonly _options: any;
  private readonly _ws: WebSocket;
  private readonly _name: string;
  private readonly _channels: Set<string>;
  constructor(socket: WebSocket, name: string, options?: any) {
    this._ws = socket;
    this._name = name;
    this._channels = new Set();
    this._options = options;
  }
  public send(type: string, payload: any, chan?: string) {
    const data = JSON.stringify({
      chan,
      payload,
      type
    });
    this._ws.send(data);
  }
  public addChannel(name: string) {
    return this._channels.add(name);
  }
  public removeChannel(name: string) {
    return this._channels.delete(name);
  }
}
