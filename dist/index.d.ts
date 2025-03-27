import type Marshal from "@boardmeister/marshal";
import type { Module } from "@boardmeister/marshal";
import type { IInjectable, RegisterConfig } from "@boardmeister/marshal";
declare class _ISubscriber {
    static subscriptions: Subscriptions;
}
export type ISubscriber = typeof _ISubscriber;
export type AmbiguousSubscription = string | Subscription | Subscription[] | EventHandler;
export type EventHandler = (event: CustomEvent) => Promise<void> | void;
export type Subscriptions = Record<string, AmbiguousSubscription>;
export interface Subscription {
    method: string | EventHandler;
    priority?: number;
    constraint?: string | Module | null;
    index?: number;
}
export interface ISubscriberObject {
    module: ISubscriber;
    config: RegisterConfig;
}
export interface IEventRegistration {
    event: string;
    subscription: AmbiguousSubscription;
    constraint?: string | Module | null;
    sort?: boolean;
    symbol?: symbol | null;
}
interface IInjection extends Record<string, object> {
    subscribers: ISubscriberObject[];
    marshal: Marshal;
}
export declare class Herald {
    #private;
    static inject: Record<string, string>;
    inject(injections: IInjection): void;
    dispatch(event: CustomEvent): Promise<void>;
    dispatchSync(event: CustomEvent): void;
    batch(events: IEventRegistration[]): () => void;
    register(event: string, subscription: AmbiguousSubscription, constraint?: string | Module | null, sort?: boolean, symbol?: symbol | null): () => void;
    unregister(event: string, symbol: symbol): void;
}
declare const EnHerald: IInjectable;
export default EnHerald;
