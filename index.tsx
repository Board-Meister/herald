import type Marshal from "@boardmeister/marshal"
import type { Module } from "@boardmeister/marshal"
import type { IInjectable, RegisterConfig } from "@boardmeister/marshal"

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
declare class _ISubscriber {
  static subscriptions: Subscriptions;
}
export type ISubscriber = typeof _ISubscriber;

export type AmbiguousSubscription = string|Subscription|Subscription[]|EventHandler;
export type EventHandler = (event: CustomEvent) => Promise<any>|any;
export type Subscriptions = Record<string, AmbiguousSubscription>;

export interface Subscription {
  method: string|EventHandler;
  priority?: number;
  constraint?: string|Module|null;
  index?: number;
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
}

interface IInjection extends Record<string, object|undefined> {
  subscribers: ISubscriberObject[];
  marshal?: Marshal;
}

export class Herald {
  #injected?: IInjection = {
    subscribers: [],
  };
  #subscribers: Record<string, Subscription[]> = {};
  #subscribersMap: Record<symbol, Subscription[]> = {};

  static inject: Record<string, string> = {
    'marshal': 'boardmeister/marshal',
    'subscribers': '!subscriber',
  }
  inject(injections: IInjection): void {
    if (!this.#injected) return;
    this.#injected = injections;
    this.#sortSubscribers();
  }

  async dispatch(event: CustomEvent): Promise<void> {
    this.#validateEvent(event);

    for (const subscriber of this.#prepareSubscribers(event.type)) {
      try {
        await this.#getSubscriberMethod(subscriber)(event);

        if (this.#continueDispatching(event)) {
          break;
        }
      } catch (e) {
        console.error('Dispatcher error:', e);
        throw e;
      }
    }
  }

  dispatchSync(event: CustomEvent): void {
    this.#validateEvent(event);

    for (const subscriber of this.#prepareSubscribers(event.type)) {
      try {
        (this.#getSubscriberMethod(subscriber) as (event: CustomEvent) => void)(event);

        if (this.#continueDispatching(event)) {
          break;
        }
      } catch (e) {
        console.error('Dispatcher error:', e);
        throw e;
      }
    }
  }

  #continueDispatching(event: CustomEvent): boolean {
    return event.cancelBubble; // @TODO feature deprecated
  }

  #validateEvent(event: any): void {
    if (!(event instanceof CustomEvent)) {
      throw new Error('Event passed to dispatcher must be of type CustomEvent')
    }
  }

  // Cloning subs array to not skip other subscriptions if previous subs unregistered during their execution
  #prepareSubscribers(key: string): Subscription[] {
    return [...(this.#subscribers[key] ?? [])];
  }

  #getSubscriberMethod(subscriber: Subscription): EventHandler {
    const constraint = subscriber.constraint!,
      { marshal = null } = this.#injected!,
      module = typeof constraint == 'string' ? marshal?.get<Module>(constraint) : constraint
    ;
    let method: EventHandler|string|null = subscriber.method;
    if (module && typeof method == 'string') {
      method = (module as Record<string, Function>)[method] as EventHandler ?? null;
      if (method) {
        method = method.bind(module);
      }
    }

    if (typeof method != 'function') {
      console.error('Error below references this object', constraint)
      throw new Error(
        'Module ' + String(constraint.constructor ?? constraint) + ' doesn\'t have non-static method '
        + String(subscriber.method)
      );
    }

    return method;
  }

  #isObject(x: unknown): boolean {
    return typeof x === 'object' && !Array.isArray(x) && x !== null;
  }

  #sortSubscribers(): void {
    const { marshal = null, subscribers = [] } = this.#injected!;
    this.#subscribers = {};
    subscribers.forEach(subscriberObject => {
      // Allows us to sort before classes where initialized
      const subscriptions = subscriberObject.module.subscriptions
        ?? (subscriberObject.module.constructor as typeof _ISubscriber)?.subscriptions
      ;
      if (typeof subscriptions != 'object') {
        return;
      }

      if (!this.#isObject(subscriptions)) {
        return;
      }

      Object.keys(subscriptions).forEach((moduleName: string) => {
        this.register(
          moduleName,
          subscriptions[moduleName],
          marshal?.getModuleConstraint(subscriberObject.config) ?? null,
          false,
        );
      });
    })

    Object.keys(this.#subscribers).forEach(event => {
      this.#sort(event);
    })
  }

  batch(events: IEventRegistration[]): () => void {
    const unregistrations: (() => void)[] = [];
    events.forEach(
      (
        {
          event,
          subscription,
          constraint = null,
          sort = true,
          symbol = null,
        }
      ) => {
        unregistrations.push(
          this.register(
            event,
            subscription,
            constraint,
            sort,
            symbol,
          )
        );
      }
    );

    return () => {
      unregistrations.forEach(unregistration => {
        unregistration()
      });
    }
  }

  register(
    event: string,
    subscription: AmbiguousSubscription,
    constraint: string|Module|null = null,
    sort = true,
    symbol: symbol|null = null,
  ): () => void {
    symbol ??= Symbol('event');

    const subs = (
      Array.isArray(subscription)
        ? subscription
        : [
          typeof subscription == 'object'
            ? subscription
            : { method: subscription }
        ]
    )
    ;
    for (const sub of subs) {
      sub.priority ??= 0;
      if (sub.priority < -256 || sub.priority > 256) {
        console.error('Subscriber priority must be in range -256:256', { [event]: sub });
        throw new Error('Error above stopped registration of an event');
      }
      sub.constraint ??= constraint;
    }

    this.#subscribers[event] = [
      ...(this.#subscribers[event] ?? []),
      ...subs,
    ];

    this.#subscribersMap[symbol] = [
      ...(this.#subscribersMap[symbol] ?? []),
      ...subs,
    ];

    sort && this.#sort(event);

    return (): void => {
      this.unregister(event, symbol);
    }
  }

  unregister(event: string, symbol: symbol): void {
    if (!this.#subscribersMap[symbol]) {
      console.warn('Tried to unregister not registered events', event);
      return;
    }

    const events = [...this.#subscribers[event]];
    this.#subscribersMap[symbol].forEach(sub => {
      const index = events.indexOf(sub);
      if (index !== -1) events.splice(index, 1);
      else throw new Error('Attempt to remove event from wrong collection');
    })
    this.#subscribers[event] = events; // Persists the changes
    delete this.#subscribersMap[symbol];
  }

  #sort(event: string): void {
    this.#subscribers[event].sort((a: Subscription, b: Subscription) => a.priority! - b.priority!);
  }
}

const EnHerald: IInjectable<IInjection> = Herald;
export default EnHerald;
