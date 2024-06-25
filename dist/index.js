var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var _a;
const Herald = (_a = class {
        constructor() {
            this.subscribers = {};
        }
        inject(injections) {
            this.injected = injections;
            this.sortSubscribers();
        }
        async dispatch(event) {
            if (!(event instanceof CustomEvent)) {
                throw new Error('Event passed to dispatcher must be of type CustomEvent');
            }
            const { marshal } = this.injected, key = event.type, subscribers = (this.subscribers[key] ?? []);
            for (const subscriber of subscribers) {
                try {
                    const constraint = marshal.getModuleConstraint(subscriber.config), module = marshal.get(constraint);
                    if (!module) {
                        throw new Error('Module ' + constraint + ' doesn\'t exist');
                    }
                    if (typeof module[subscriber.method] != 'function') {
                        throw new Error('Module ' + constraint + ' doesn\'t have non-static method ' + subscriber.method);
                    }
                    await module[subscriber.method](event);
                    // Stop propagation
                    if (event.cancelBubble) {
                        break;
                    }
                }
                catch (e) {
                    console.error('Dispatcher error:', e);
                }
            }
        }
        isObject(x) {
            return typeof x === 'object' && !Array.isArray(x) && x !== null;
        }
        sortSubscribers() {
            const moduleToSubscriptions = {};
            this.injected.subscribers.forEach(subscriberObject => {
                // Allows us to sort before classes where initialized
                const subscriptions = subscriberObject.module.subscriptions
                    ?? subscriberObject.module.constructor?.subscriptions;
                if (typeof subscriptions != 'object') {
                    return;
                }
                if (!this.isObject(subscriptions)) {
                    return;
                }
                Object.keys(subscriptions).forEach((moduleName) => {
                    if (!moduleToSubscriptions[moduleName]) {
                        moduleToSubscriptions[moduleName] = [];
                    }
                    if (this.isObject(subscriptions[moduleName])) {
                        moduleToSubscriptions[moduleName] = [
                            ...moduleToSubscriptions[moduleName],
                            { ...subscriptions[moduleName], config: subscriberObject.config },
                        ];
                    }
                    else if (Array.isArray(subscriptions[moduleName])) {
                        moduleToSubscriptions[moduleName] = [
                            ...moduleToSubscriptions[moduleName],
                            ...(subscriptions[moduleName].map(subscription => ({
                                ...subscription,
                                config: subscriberObject.config,
                            }))),
                        ];
                    }
                    else {
                        moduleToSubscriptions[moduleName] = [
                            ...moduleToSubscriptions[moduleName],
                            { method: subscriptions[moduleName], priority: 0, config: subscriberObject.config },
                        ];
                    }
                });
            });
            Object.keys(moduleToSubscriptions).forEach(moduleToSubscription => {
                moduleToSubscriptions[moduleToSubscription].sort(function (a, b) {
                    return a.priority - b.priority;
                });
            });
            this.subscribers = moduleToSubscriptions;
        }
    },
    __setFunctionName(_a, "Herald"),
    _a.inject = {
        'marshal': 'boardmeister/marshal',
        'subscribers': '!subscriber',
    },
    _a);
export default Herald;
