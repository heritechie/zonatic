import { db } from '../db/client.js';

export type Context = {
  db: typeof db;
  user: null;
};

export function createContext(): Context {
  return {
    db,
    user: null,
  };
}
