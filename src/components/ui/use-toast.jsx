import { useEffect, useState } from 'react';

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 1000;
let toastCount = 0;
let state = { toasts: [] };
const listeners = new Set();
const removalTimers = new Map();

function nextId() {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER;
  return String(toastCount);
}

function publish(action) {
  switch (action.type) {
    case 'add':
      state = { toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
      break;
    case 'update':
      state = {
        toasts: state.toasts.map((toastItem) =>
          toastItem.id === action.id ? { ...toastItem, ...action.toast } : toastItem,
        ),
      };
      break;
    case 'dismiss':
      state = {
        toasts: state.toasts.map((toastItem) =>
          !action.id || toastItem.id === action.id ? { ...toastItem, open: false } : toastItem,
        ),
      };
      break;
    case 'remove':
      state = {
        toasts: action.id
          ? state.toasts.filter((toastItem) => toastItem.id !== action.id)
          : [],
      };
      break;
    default:
      return;
  }
  listeners.forEach((listener) => listener(state));
}

function scheduleRemoval(id) {
  if (removalTimers.has(id)) return;
  const timer = setTimeout(() => {
    removalTimers.delete(id);
    publish({ type: 'remove', id });
  }, TOAST_REMOVE_DELAY);
  removalTimers.set(id, timer);
}

export function toast(props) {
  const id = nextId();
  const update = (nextProps) => publish({ type: 'update', id, toast: nextProps });
  const dismiss = () => {
    publish({ type: 'dismiss', id });
    scheduleRemoval(id);
  };

  publish({
    type: 'add',
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return { id, dismiss, update };
}

export function useToast() {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(state);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return { ...current, toast };
}
