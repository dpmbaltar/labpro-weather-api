import { Collection, MongoClient } from 'mongodb';
import { dbConfig } from './config';

let client;
let connection;
const collections = {
  cache: null
};

export function connect(): Promise<MongoClient> {
  return new Promise<MongoClient>((resolve, reject) => {
    if (!connection) {
      client = new MongoClient(dbConfig.uri);
      connection = client.connect()
        .then(initCache)
        .catch(error => reject(error));
    }

    resolve(connection);
  });
}

export function cache(): Collection {
  return collections.cache;
}

function initCache(client: MongoClient) {
  const db = client.db(dbConfig.name);
  collections.cache = db.collection(dbConfig.collections.cache);
  collections.cache.createIndex({ _location: "2dsphere" });
  collections.cache.createIndex({ _timestamp: -1 }, {
    expireAfterSeconds: dbConfig.options.cacheTtl
  });

  return client;
}
