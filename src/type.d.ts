export type AmbiguousSubscription = string|OptionalSubscription|OptionalSubscription[]|EventHandler;
export type EventHandler = (event: CustomEvent) => Promise<any>|any;
export type Subscriptions = Record<string, AmbiguousSubscription>;
import type { Module, RegisterConfig } from "@boardmeister/marshal"

export type Anchor = Node|object|symbol|null;

export interface Subscription {
  method: string|EventHandler;
  priority: number;
  constraint: string|Module|null;
  anchor: Anchor;
}

export interface OptionalSubscription {
  method: string|EventHandler;
  priority?: number;
  constraint?: string|Module|null;
  anchor?: Anchor;
}

export interface ISubscriberObject {
  module: ISubscriber;
  config: RegisterConfig;
}

export interface IEventRegistration {
  event: string,
  subscription: AmbiguousSubscription,
  constraint?: string|Module|null,
  sort?: boolean,
  symbol?: symbol|null,
  anchor?: Anchor,
}

export interface IListen {
  event: string,
  subscription: AmbiguousSubscription,
  anchor?: Anchor,
  symbol?: symbol|null,
  sort?: boolean,
  constraint?: string|Module|null,
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
declare class _ISubscriber {
  static subscriptions: Subscriptions;
}
export type ISubscriber = typeof _ISubscriber;

export type LocalizedEventDirection = 'up'|'down'|'both';

export interface IEventSettings {
  origin?: Anchor;
  direction?: LocalizedEventDirection;
}