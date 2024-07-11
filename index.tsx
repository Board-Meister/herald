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
      subscribers = (this.#subscribers[key] ?? [])
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
    constraint?: string|Module|null,
    sort = true
  ): void {
    const subs = (Array.isArray(subscription) ? subscription : [subscription]) as Subscription[];
    for (const sub of subs) {
      if (sub.priority < -256 || sub.priority > 256) {
        console.error('Subscriber priority must be in range -256:256', { [event]: sub });
        return;
      }
    }

    constraint ??= null;

    this.#subscribers[event] = [
      ...(this.#subscribers[event] ?? []),
      ...(this.#isObject(subscription) && [{ ...subscription as Subscription, constraint }])
        || (Array.isArray(subscription) && (subscription.map(subscription => ({ ...subscription, constraint }))))
        || ([{ method: subscription as string|EventHandler, priority: 0, constraint }])
      ,
    ];

    sort && this.#sort(event);
  }

  #sort(event: string): void {
    this.#subscribers[event].sort((a: Subscription, b: Subscription) => a.priority - b.priority);
  }
}

const EnHerald: IInjectable = Herald;
export default EnHerald;
