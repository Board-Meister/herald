import type Marshal from "@boardmeister/marshal"
import type { Module } from "@boardmeister/marshal"
import type { IInjectable, RegisterConfig } from "@boardmeister/marshal"

export interface Subscription {
  method: string;
  priority: number;
  config?: RegisterConfig;
}

export type Subscriptions = Record<string, string|Subscription|Subscription[]>;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
declare class _ISubscriber {
  static subscriptions: Subscriptions;
}
export type ISubscriber = typeof _ISubscriber;

interface IInjection extends Record<string, object> {
  subscribers: { module: ISubscriber, config: RegisterConfig }[];
  marshal: Marshal;
}

export interface IHerald {
  dispatch: (event: CustomEvent) => Promise<void>;
  sortSubscribers: () => void;
}

const Herald: IInjectable = class implements IHerald {
  injected?: IInjection;
  subscribers: Record<string, Subscription[]> = {};

  static inject: Record<string, string> = {
    'marshal': 'boardmeister/marshal',
    'subscribers': '!subscriber',
  }
  inject(injections: IInjection): void {
    this.injected = injections;
    this.sortSubscribers();
  }

  async dispatch(event: CustomEvent): Promise<void> {
    if (!(event instanceof CustomEvent)) {
      throw new Error('Event passed to dispatcher must be of type CustomEvent')
    }

    const { marshal } = this.injected!,
      key = event.type,
      subscribers = (this.subscribers[key] ?? [])
    ;
    for (const subscriber of subscribers) {
      try {
        const constraint = marshal.getModuleConstraint(subscriber.config!),
          module = marshal.get<Module>(constraint);
        if (!module) {
          throw new Error('Module ' + constraint + ' doesn\'t exist');
        }
        if (typeof module[subscriber.method] != 'function') {
          throw new Error('Module ' + constraint + ' doesn\'t have non-static method ' + subscriber.method);
        }
        await (module[subscriber.method] as Function)(event);
        // Stop propagation
        if (event.cancelBubble) {
          break;
        }
      } catch (e) {
        console.error('Dispatcher error:', e);
      }
    }
  }

  isObject(x: unknown): boolean {
    return typeof x === 'object' && !Array.isArray(x) && x !== null;
  }

  sortSubscribers(): void {
    const moduleToSubscriptions: Record<string, Subscription[]> = {};
    this.injected!.subscribers.forEach(subscriberObject => {
      // Allows us to sort before classes where initialized
      const subscriptions = subscriberObject.module.subscriptions
        ?? ((subscriberObject.module as any).constructor as typeof _ISubscriber)?.subscriptions;
      if (typeof subscriptions != 'object') {
        return;
      }

      if (!this.isObject(subscriptions)) {
        return;
      }

      Object.keys(subscriptions).forEach((moduleName: string) => {
        if (!moduleToSubscriptions[moduleName]) {
          moduleToSubscriptions[moduleName] = [];
        }

        if (this.isObject(subscriptions[moduleName])) {
          moduleToSubscriptions[moduleName] = [
            ...moduleToSubscriptions[moduleName],
            { ...subscriptions[moduleName] as Subscription, config: subscriberObject.config },
          ];
        } else if (Array.isArray(subscriptions[moduleName])) {
          moduleToSubscriptions[moduleName] = [
            ...moduleToSubscriptions[moduleName],
            ...((subscriptions[moduleName] as Subscription[]).map(subscription => ({
              ...subscription,
              config: subscriberObject.config,
            }))),
          ];
        } else {
          moduleToSubscriptions[moduleName] = [
            ...moduleToSubscriptions[moduleName],
            { method: subscriptions[moduleName] as string, priority: 0, config: subscriberObject.config },
          ];
        }
      });
    })

    Object.keys(moduleToSubscriptions).forEach(moduleToSubscription => {
      moduleToSubscriptions[moduleToSubscription].sort(function(a: Subscription, b: Subscription) {
        return a.priority - b.priority;
      });
    })

    this.subscribers = moduleToSubscriptions;
  }
}

export default Herald;
