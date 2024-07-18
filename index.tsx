import type Marshal from "@boardmeister/marshal"
import type { Module } from "@boardmeister/marshal"
import type { IInjectable, RegisterConfig } from "@boardmeister/marshal"

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
declare class _ISubscriber {
  static subscriptions: Subscriptions;
}
export type ISubscriber = typeof _ISubscriber;

export type AmbiguousSubscription = string|Subscription|Subscription[]|EventHandler;
export type EventHandler = (event: CustomEvent) => Promise<void>|void;
export type Subscriptions = Record<string, AmbiguousSubscription>;

export interface Subscription {
  method: string|EventHandler;
  priority: number;
  constraint?: string|Module|null;
  index?: number;
}

export interface ISubscriberObject {
  module: ISubscriber;
  config: RegisterConfig;
}

interface IInjection extends Record<string, object> {
  subscribers: ISubscriberObject[];
  marshal: Marshal;
}

export class Herald {
  #injected?: IInjection;
  #subscribers: Record<string, Subscription[]> = {};
  #subscribersMap: Record<symbol, Subscription[]> = {};

  static inject: Record<string, string> = {
    'marshal': 'boardmeister/marshal',
    'subscribers': '!subscriber',
  }
  inject(injections: IInjection): void {
    if (this.#injected) return;
    this.#injected = injections;
    this.#sortSubscribers();
  }

  async dispatch(event: CustomEvent): Promise<void> {
    if (!(event instanceof CustomEvent)) {
      throw new Error('Event passed to dispatcher must be of type CustomEvent')
    }

    const { marshal } = this.#injected!,
      key = event.type,
      // Cloning subs array to not skip other subscriptions if previous subs unregistered during their execution
      subscribers = [...(this.#subscribers[key] ?? [])]
    ;
    for (const subscriber of subscribers) {
      try {
        const constraint = subscriber.constraint!,
          module = typeof constraint == 'string' ? marshal.get<Module>(constraint) : constraint
        ;
        let method: EventHandler|string|null = subscriber.method;
        if (module && typeof method == 'string') {
          method = module[method] as EventHandler ?? null;
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

        await method(event);

        // Stop propagation
        if (event.cancelBubble) {
          break;
        }
      } catch (e) {
        console.error('Dispatcher error:', e);
        throw e;
      }
    }
  }

  #isObject(x: unknown): boolean {
    return typeof x === 'object' && !Array.isArray(x) && x !== null;
  }

  #sortSubscribers(): void {
    const { marshal } = this.#injected!;
    this.#subscribers = {};
    this.#injected!.subscribers.forEach(subscriberObject => {
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
          marshal.getModuleConstraint(subscriberObject.config),
          false,
        );
      });
    })

    Object.keys(this.#subscribers).forEach(event => {
      this.#sort(event);
    })
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
      ) as Subscription[]
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
    this.#subscribers[event].sort((a: Subscription, b: Subscription) => a.priority - b.priority);
  }
}

const EnHerald: IInjectable = Herald;
export default EnHerald;
