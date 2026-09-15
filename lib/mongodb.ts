import mongoose from "mongoose";
import { Participant } from "./models/Participant";
import { PrizeInventory } from "./models/PrizeInventory";

const MONGODB_URI = process.env.MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Reused across hot-reloads in dev so we don't open a new connection per request.
declare global {
  // eslint-disable-next-line no-var
  var __spinWinMongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.__spinWinMongooseCache ?? { conn: null, promise: null };
global.__spinWinMongooseCache = cache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local.");
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(MONGODB_URI, {
        maxPoolSize: 10,
        // Fail fast (default is 30s) so a bad connection string, an unreachable
        // cluster, or an un-whitelisted IP surfaces in seconds instead of leaving
        // every page hanging on "Loading..." for half a minute.
        serverSelectionTimeoutMS: 8000,
      })
      .then(async (m) => {
        // Mongoose's autoIndex builds indexes in the background by default — without
        // this, the email/phone uniqueness constraint that prevents a double spin
        // may not exist yet when the first requests arrive (e.g. right after a fresh
        // deploy). Model.init() resolves only once index creation has finished, so
        // callers of connectToDatabase() are guaranteed the constraint is live.
        await Promise.all([Participant.init(), PrizeInventory.init()]);
        return m;
      });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}
