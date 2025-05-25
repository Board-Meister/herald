import type Marshal from "@boardmeister/marshal"
import type { IInjectable, Module } from "@boardmeister/marshal"
import type { IListen, _ISubscriber, AmbiguousSubscription, IEventRegistration, ISubscriberObject, IEventSettings } from "./type.d";
import Herald from "./herald";

interface IInjection extends Record<string, object|undefined> {
  subscribers: ISubscriberObject[];
  marshal?: Marshal;
}

export class HeraldPlugin {
  #injected?: IInjection = {
    subscribers: [],
  };
  #herald: Herald;

  static inject: Record<string, string> = {
    'marshal': 'boardmeister/marshal',
    'subscribers': '!subscriber',
  }
  inject(injections: IInjection): void {
    this.#injected = injections;
    this.#herald = new Herald(this.#injected.marshal);
    this.#sortAndRegisterSubscribers();
  }

  dispatch(event: CustomEvent, settings: IEventSettings = {}): Promise<void> {
    return this.#herald.dispatch(event, settings);
  }

  dispatchSync(event: CustomEvent, settings: IEventSettings = {}): void {
    return this.#herald.dispatchSync(event, settings);
  }

  batch(events: IEventRegistration[]): () => void {
    return this.#herald.batch(events);
  }

  listen(subscription: IListen): () => void {
    return this.#herald.listen(subscription);
  }

  register(
    event: string,
    subscription: AmbiguousSubscription,
    constraint: string|Module|null = null,
    sort = true,
    symbol: symbol|null = null,
    anchor: Node|null = null,
  ): () => void {
    return this.#herald.register(event, subscription, constraint, sort, symbol, anchor);
  }

  unregister(event: string, symbol: symbol): void {
    return this.#herald.unregister(event, symbol);
  }

  #sortAndRegisterSubscribers(): void {
    const { marshal = null, subscribers = [] } = this.#injected!;
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
        this.#herald.listen({
          event: moduleName,
          subscription: subscriptions[moduleName],
          constraint: marshal?.getModuleConstraint(subscriberObject.config) ?? null,
        });
      });
    })
  }

  #isObject(x: unknown): boolean {
    return typeof x === 'object' && !Array.isArray(x) && x !== null;
  }
}

const EnHerald: IInjectable<IInjection> = HeraldPlugin;
export default EnHerald;