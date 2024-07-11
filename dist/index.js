var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Herald_instances, _Herald_injected, _Herald_subscribers, _Herald_isObject, _Herald_sortSubscribers, _Herald_sort;
export class Herald {
    constructor() {
        _Herald_instances.add(this);
        _Herald_injected.set(this, void 0);
        _Herald_subscribers.set(this, {});
    }
    inject(injections) {
        if (__classPrivateFieldGet(this, _Herald_injected, "f"))
            return;
        __classPrivateFieldSet(this, _Herald_injected, injections, "f");
        __classPrivateFieldGet(this, _Herald_instances, "m", _Herald_sortSubscribers).call(this);
    }
    async dispatch(event) {
        if (!(event instanceof CustomEvent)) {
            throw new Error('Event passed to dispatcher must be of type CustomEvent');
        }
        const { marshal } = __classPrivateFieldGet(this, _Herald_injected, "f"), key = event.type, subscribers = (__classPrivateFieldGet(this, _Herald_subscribers, "f")[key] ?? []);
        for (const subscriber of subscribers) {
            try {
                const constraint = subscriber.constraint, module = typeof constraint == 'string' ? marshal.get(constraint) : constraint;
                let method = subscriber.method;
                if (module && typeof method == 'string') {
                    method = module[method] ?? null;
                    if (method) {
                        method = method.bind(module);
                    }
                }
                if (typeof method != 'function') {
                    throw new Error('Module ' + String(constraint.constructor ?? constraint) + ' doesn\'t have non-static method '
                        + String(subscriber.method));
                }
                await method(event);
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
    register(event, subscription, constraint, sort = true) {
        const subs = (Array.isArray(subscription) ? subscription : [subscription]);
        for (const sub of subs) {
            if (sub.priority < -256 || sub.priority > 256) {
                console.error('Subscriber priority must be in range -256:256', { [event]: sub });
                return;
            }
        }
        constraint ?? (constraint = null);
        __classPrivateFieldGet(this, _Herald_subscribers, "f")[event] = [
            ...(__classPrivateFieldGet(this, _Herald_subscribers, "f")[event] ?? []),
            ...(__classPrivateFieldGet(this, _Herald_instances, "m", _Herald_isObject).call(this, subscription) && [{ ...subscription, constraint }])
                || (Array.isArray(subscription) && (subscription.map(subscription => ({ ...subscription, constraint }))))
                || ([{ method: subscription, priority: 0, constraint }]),
        ];
        sort && __classPrivateFieldGet(this, _Herald_instances, "m", _Herald_sort).call(this, event);
    }
}
_Herald_injected = new WeakMap(), _Herald_subscribers = new WeakMap(), _Herald_instances = new WeakSet(), _Herald_isObject = function _Herald_isObject(x) {
    return typeof x === 'object' && !Array.isArray(x) && x !== null;
}, _Herald_sortSubscribers = function _Herald_sortSubscribers() {
    const { marshal } = __classPrivateFieldGet(this, _Herald_injected, "f");
    __classPrivateFieldSet(this, _Herald_subscribers, {}, "f");
    __classPrivateFieldGet(this, _Herald_injected, "f").subscribers.forEach(subscriberObject => {
        // Allows us to sort before classes where initialized
        const subscriptions = subscriberObject.module.subscriptions
            ?? subscriberObject.module.constructor?.subscriptions;
        if (typeof subscriptions != 'object') {
            return;
        }
        if (!__classPrivateFieldGet(this, _Herald_instances, "m", _Herald_isObject).call(this, subscriptions)) {
            return;
        }
        Object.keys(subscriptions).forEach((moduleName) => {
            this.register(moduleName, subscriptions[moduleName], marshal.getModuleConstraint(subscriberObject.config), false);
        });
    });
    Object.keys(__classPrivateFieldGet(this, _Herald_subscribers, "f")).forEach(event => {
        __classPrivateFieldGet(this, _Herald_instances, "m", _Herald_sort).call(this, event);
    });
}, _Herald_sort = function _Herald_sort(event) {
    __classPrivateFieldGet(this, _Herald_subscribers, "f")[event].sort((a, b) => a.priority - b.priority);
};
Herald.inject = {
    'marshal': 'boardmeister/marshal',
    'subscribers': '!subscriber',
};
const EnHerald = Herald;
export default EnHerald;
