import type { IInjectable, RegisterConfig } from "@boardmeister/marshal";
export interface Subscription {
    method: string;
    priority: number;
    config?: RegisterConfig;
}
export type Subscriptions = Record<string, string | Subscription | Subscription[]>;
declare class _ISubscriber {
    static subscriptions: Subscriptions;
}
export type ISubscriber = typeof _ISubscriber;
export interface IHerald {
    dispatch: (event: CustomEvent) => Promise<void>;
    sortSubscribers: () => void;
}
declare const Herald: IInjectable;
export default Herald;
