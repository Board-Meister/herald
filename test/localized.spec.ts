import { Herald } from "src/index";

describe('Herald localized events', () => {
  let herald: Herald;
  const main = document.createElement('main');
  const eventDispatcher = document.createElement('div')
  main.appendChild(eventDispatcher);
  const eventReceiver = document.createElement('div')
  eventDispatcher.appendChild(eventReceiver);
  beforeEach(() => {
    herald = new Herald();
  })

  it('travels down properly', async () => {
    let resolvedCounter = 0;
    herald.listen({
      event: 'test',
      subscription: () => {
        resolvedCounter++;
      },
      anchor: eventReceiver,
    });
    herald.listen({
      event: 'test',
      subscription: () => {
        resolvedCounter += 2;
      },
      anchor: main,
    });
    herald.dispatchSync(new CustomEvent('test'), {
      origin: eventDispatcher,
      direction: 'down',
    });

    expect(resolvedCounter).toBe(1);
  })

  it('travels up properly', async () => {
    let resolvedCounter = 0;
    herald.listen({
      event: 'test',
      subscription: () => {
        resolvedCounter += 2;
      },
      anchor: eventReceiver,
    });
    herald.listen({
      event: 'test',
      subscription: () => {
        resolvedCounter++;
      },
      anchor: main,
    });
    herald.dispatchSync(new CustomEvent('test'), {
      origin: eventDispatcher,
      direction: 'up',
    });

    expect(resolvedCounter).toBe(1);
  })

  it('travels both ways properly', async () => {
    let resolvedCounter = 0;
    herald.listen({
      event: 'test',
      subscription: () => {
        resolvedCounter++;
      },
      anchor: eventReceiver,
    });
    herald.listen({
      event: 'test',
      subscription: () => {
        resolvedCounter++;
      },
      anchor: main,
    });
    herald.dispatchSync(new CustomEvent('test'), {
      origin: eventDispatcher,
      direction: 'both',
    });

    expect(resolvedCounter).toBe(2);
  })

  it('works if listens on the same element', async () => {
    let resolvedCounter = 0;
    herald.listen({
      event: 'test',
      subscription: () => {
        resolvedCounter++;
      },
      anchor: eventDispatcher,
    });
    herald.dispatchSync(new CustomEvent('test'), {
      origin: eventDispatcher,
      direction: 'both',
    });

    expect(resolvedCounter).toBe(1);
  })

  it('can still be triggered globally', async () => {
    let resolvedCounter = 0;
    herald.listen({
      event: 'test',
      subscription: () => {
        resolvedCounter++;
      },
      anchor: eventDispatcher,
    });
    herald.listen({
      event: 'test',
      subscription: () => {
        resolvedCounter++;
      },
    });
    herald.dispatchSync(new CustomEvent('test'), {
      origin: eventDispatcher,
      direction: 'both',
    });

    expect(resolvedCounter).toBe(2);
  })
});
