/* Copyright @author: G. Hemingway @2022 - All rights reserved */
"use strict";

import { Client } from "./client.js";
import { IHandler, Manager } from "./index.js";

export class Router {
  private readonly _handlers: Map<string, IHandler>;
  private readonly _chanHanlders: Map<string, Map<string, IHandler>>;
  private readonly _manager: Manager;
  constructor(manager: Manager) {
    this._manager = manager;
    this._handlers = new Map();
    this._chanHanlders = new Map();
  }
  public on(type: string, handler: IHandler) {
    this._handlers.set(type, handler);
  }
  public onChannel(channel: string, type: string, handler: IHandler) {
    const chanMap = this._chanHanlders.get(channel);
    console.log(chanMap);
  }
  public handler(
    manager: Manager,
    client: Client,
    type: string,
    payload: any,
    next: () => {}
  ) {
    console.log(`In router default handler: ${this._manager}`);
    next();
  }
}
