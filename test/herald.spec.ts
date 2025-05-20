import { Herald } from "index";

describe('Herald', () => {
  let herald: Herald;
  beforeEach(() => {
    herald = new Herald();
  })

  it('registers and dispatches events properly', async () => {
    let fired = false;
    herald.register('test', () => {
      fired = true;
    });
    await herald.dispatch(new CustomEvent('test'));

    expect(fired).toBeTrue();
  });

  it('event caries details to handler', async () => {
    const info = Math.random();
    let fired: false|number = false;
    herald.register('test', (e: CustomEvent<{ info: number }>) => {
      fired = e.detail.info;
    });
    await herald.dispatch(new CustomEvent('test', {
      detail: {
        info,
      }
    }));

    expect(fired).toBe(info);
  });

  it('allows to unregister from event', async () => {
    let fired = false;
    const unregister = herald.register('test', () => {
      fired = true;
    });
    await herald.dispatch(new CustomEvent('test'));

    expect(fired).toBeTrue();
    fired = false;
    unregister();
    await herald.dispatch(new CustomEvent('test'));
    expect(fired).toBeFalse();
  });

  it('dispatches event synchronously if needed', () => {
    let fired = false;
    herald.register('test', () => {
      fired = true;
    });
    herald.dispatchSync(new CustomEvent('test'));

    expect(fired).toBeTrue();
  });

  it('allows for batch registration and undo', async () => {
    let fired = false,
      fired2 = false;
    const unregister = herald.batch([
      {
        event: 'test',
        subscription: () => {
          fired = true;
        }
      },
      {
        event: 'test2',
        subscription: () => {
          fired2 = true;
        }
      }
    ])

    await herald.dispatch(new CustomEvent('test'));
    expect(fired).toBeTrue();

    await herald.dispatch(new CustomEvent('test2'));
    expect(fired2).toBeTrue();

    unregister();
    fired = false;
    fired2 = false;

    await herald.dispatch(new CustomEvent('test'));
    expect(fired).toBeFalse();

    await herald.dispatch(new CustomEvent('test2'));
    expect(fired2).toBeFalse();
  });

  it('allows manual deregistration', async () => {
    const registerSymbol = Symbol('register');
    let fired = false;
    herald.register('test', () => {
      fired = true;
    }, null, true, registerSymbol);

    await herald.dispatch(new CustomEvent('test'));
    expect(fired).toBeTrue();

    herald.unregister('test', registerSymbol);
    fired = false;

    await herald.dispatch(new CustomEvent('test'));
    expect(fired).toBeFalse();
  });

  it('allows to set priority', async () => {
    const fired: number[] = [];
    herald.register(
      'test',
      {
        method: () => {
          fired.push(1);
        },
        priority: 1,
      }
    );
    herald.register(
      'test',
      {
        method: () => {
          fired.push(-1);
        },
        priority: -1,
      }
    );
    herald.register(
      'test',
      {
        method: () => {
          fired.push(0);
        },
        priority: 0,
      }
    );

    await herald.dispatch(new CustomEvent('test'));
    expect(fired).toEqual(jasmine.objectContaining([-1, 0, 1]));
  });

  it('allows to set priority on batch', async () => {
    const fired: number[] = [];
    herald.batch([
      {
        event: 'test',
        subscription: {
          method: () => {
            fired.push(0);
          },
          priority: 0,
        }
      },
      {
        event: 'test',
        subscription: {
          method: () => {
            fired.push(1);
          },
          priority: 1,
        }
      },
      {
        event: 'test',
        subscription: {
          method: () => {
            fired.push(-1);
          },
          priority: -1,
        }
      }
    ])

    await herald.dispatch(new CustomEvent('test'));
    expect(fired).toEqual(jasmine.objectContaining([-1, 0, 1]));
  });

  it('allows to stop event from propagating', async () => {
    let fired = false;
    herald.batch([
      {
        event: 'test',
        subscription: {
          method: (e: CustomEvent) => {
            fired = true;
            e.stopPropagation();
          },
          priority: 0,
        }
      },
      {
        event: 'test',
        subscription: {
          method: () => {
            fired = false;
          },
          priority: 1,
        }
      },
    ])

    await herald.dispatch(new CustomEvent('test'));
    expect(fired).toBeTrue();
  });
});