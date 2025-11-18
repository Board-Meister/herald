import type { Module } from "@boardmeister/marshal"
import type {
  Subscription, IEventRegistration, IListen, AmbiguousSubscription, OptionalSubscription, EventHandler,
  IEventSettings,
  LocalizedEventDirection,
  Anchor
} from "./type.d";
import type Marshal from "@boardmeister/marshal";

export default class Herald {
  #subscribers: Record<string, Subscription[]> = {};
  #subscribersMap: Record<symbol, Subscription[]> = {};
  #marshal: Marshal|null = null;

  constructor(marshal: Marshal|null = null) {
    this.#marshal = marshal;
  }

  async dispatch(event: CustomEvent, settings: IEventSettings = {}): Promise<void> {
    this.#validateEvent(event);

    for (const subscriber of this.#prepareSubscribers(event.type, settings)) {
      try {
        await this.#getSubscriberMethod(subscriber)(event);

        if (this.#stopDispatching(event)) {
          break;
        }
      } catch (e) {
        console.error('Dispatcher error:', e);
        throw e;
      }
    }
  }

  dispatchSync(event: CustomEvent, settings: IEventSettings = {}): void {
    this.#validateEvent(event);

    for (const subscriber of this.#prepareSubscribers(event.type, settings)) {
      try {
        (this.#getSubscriberMethod(subscriber) as (event: CustomEvent) => void)(event);

        if (this.#stopDispatching(event)) {
          break;
        }
      } catch (e) {
        console.error('Dispatcher error:', e);
        throw e;
      }
    }
  }

  batch(events: IEventRegistration[]): () => void {
    const unregisterArr: (() => void)[] = [];
    events.forEach(
      (
        {
          event,
          subscription,
          constraint = null,
          sort = true,
          symbol = null,
          anchor = null,
        }
      ) => {
        unregisterArr.push(
          this.listen({
            event,
            subscription,
            constraint,
            sort,
            symbol,
            anchor,
          })
        );
      }
    );

    return () => {
      unregisterArr.forEach(unregister => {
        unregister()
      });
    }
  }

  /**
   * Wrapper method for `register`
   * Makes is easier when you want to specify just anchor or just symbol. Thanks to that we don't have to write:
   *
   * `register('event', [], null, null, null, Node);`
   *
   * instead we can:
   *
   * `listen({event: 'event', subscription: [], anchor: Node});`
   *
   * still, using registration can result in a smaller size, so it's not completely useless.
   */
  listen({
    event,
    subscription,
    constraint = null,
    sort = true,
    symbol = null,
    anchor = null,
  }: IListen): () => void {
    return this.register(event, subscription, constraint, sort, symbol, anchor);
  }

  register(
    event: string,
    subscription: AmbiguousSubscription,
    constraint: string|Module|null = null,
    sort = true,
    symbol: symbol|null = null,
    anchor: Anchor = null,
  ): () => void {
    symbol ??= this.#generateEventSymbol();
    const subs = this.#ambiguousToSubscriptions(subscription, constraint, anchor);
    const unregister = this.#setSubscriptions(event, symbol, subs);

    sort && this.#sort(event);

    return unregister
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

  #ambiguousToSubscriptions(
    subscription: AmbiguousSubscription,
    constraint:  string|Module|null = null,
    anchor:  Anchor = null,
  ): Subscription[] {
    const subs: OptionalSubscription[] = (
      Array.isArray(subscription)
        ? subscription
        : [
          typeof subscription == 'object'
            ? subscription
            : { method: subscription }
        ]
    );

    const subscriptions: Subscription[] = [];
    for (const sub of subs) {
      subscriptions.push({
        method: sub.method,
        priority: sub.priority ?? 0,
        constraint: sub.constraint ?? constraint,
        anchor: sub.anchor ?? anchor,
      })
    }

    return subscriptions;
  }

  #setSubscriptions(event: string, symbol: symbol, subscriptions: Subscription[]): () => void {
    this.#subscribers[event] = [
      ...(this.#subscribers[event] ?? []),
      ...subscriptions,
    ];

    this.#subscribersMap[symbol] = [
      ...(this.#subscribersMap[symbol] ?? []),
      ...subscriptions,
    ];

    return (): void => {
      this.unregister(event, symbol);
    }
  }

  #generateEventSymbol(): symbol {
    return Symbol('event');
  }

  #stopDispatching(event: CustomEvent): boolean {
    return event.cancelBubble; // @TODO feature deprecated
  }

  #validateEvent(event: any): void {
    if (!(event instanceof CustomEvent)) {
      throw new Error('Event passed to dispatcher must be of type CustomEvent')
    }
  }

  // Cloning subs array to not skip other subscriptions if previous subs unregistered during their execution
  #prepareSubscribers(
    key: string,
    {
      origin = null,
      direction = 'up',
    }: IEventSettings
  ): Subscription[] {
    const filtered: Subscription[] = [];
    for (const sub of this.#subscribers[key] ?? []) {
      if (this.#listensForLocalizedEvents(sub, origin, direction)) {
        filtered.push(sub);
      }
    }

    return filtered;
  }

  #listensForLocalizedEvents(sub: Subscription, origin: Anchor, direction: LocalizedEventDirection) {
    if (!origin || !sub.anchor || sub.anchor === origin) {
      return true;
    }

    if (!(sub.anchor instanceof Node) || !(origin instanceof Node)) {
      return false;
    }

    return direction == 'up' && sub.anchor.contains(origin)
      || direction == 'down' && origin.contains(sub.anchor)
      || direction == 'both' && (origin.contains(sub.anchor) || sub.anchor.contains(origin))
    ;
  }

  #getSubscriberMethod(subscriber: Subscription): EventHandler {
    const constraint = subscriber.constraint,
      module = typeof constraint == 'string' ? this.#marshal?.get<Module>(constraint) : constraint
    ;
    let method: EventHandler|string|null = subscriber.method;
    if (module && typeof method == 'string') {
      method = (module as Record<string, Function>)[method] as EventHandler ?? null;
      if (method) {
        method = method.bind(module);
      }
    }

    if (typeof method != 'function') {
      console.error('Error below is related to this subscriber', subscriber);
      throw new Error(`Subscriber doesn't have proper method`);
    }

    return method;
  }

  #sort(event: string): void {
    this.#subscribers[event].sort((a: Subscription, b: Subscription) => a.priority - b.priority);
  }
}

