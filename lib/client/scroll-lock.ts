interface ScrollLock {
  holders: number;
  overflow: string;
  priority: string;
}

const locks = new WeakMap<HTMLElement, ScrollLock>();

export function lockPageScroll(body = document.body): () => void {
  let lock = locks.get(body);
  if (!lock) {
    lock = {
      holders: 0,
      overflow: body.style.getPropertyValue('overflow'),
      priority: body.style.getPropertyPriority('overflow'),
    };
    locks.set(body, lock);
    body.style.setProperty('overflow', 'hidden');
  }
  lock.holders += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lock.holders -= 1;
    if (lock.holders > 0) return;
    if (lock.overflow) body.style.setProperty('overflow', lock.overflow, lock.priority);
    else body.style.removeProperty('overflow');
    locks.delete(body);
  };
}
