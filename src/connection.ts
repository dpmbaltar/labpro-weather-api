import { Collection, MongoClient } from 'mongodb';
import { dbConfig } from './config';

let client;
let connection;
export const collections = {
  cache: null,
  location: null,
  historical: null
};

export function connect(): Promise<MongoClient> {
  return new Promise<MongoClient>((resolve, reject) => {
    if (!connection) {
      client = new MongoClient(dbConfig.uri);
      connection = client.connect()
        .then(initCollections)
        .catch(error => reject(error));
    }

    resolve(connection);
  });
}

function initCollections(client: MongoClient) {
  const db = client.db(dbConfig.name);

  db.collection(dbConfig.collections.cache).drop();
  db.collection(dbConfig.collections.location).drop();
  db.collection(dbConfig.collections.historical).drop();

  collections.cache = db.collection(dbConfig.collections.cache);
  collections.cache.createIndex({ _location: "2dsphere" });
  collections.cache.createIndex(
    { _timestamp: -1 },
    { expireAfterSeconds: dbConfig.options.cacheTtl }
  );

  collections.location = db.collection(dbConfig.collections.location);
  collections.location.createIndex({ _location: "2dsphere" });

  collections.historical = db.collection(dbConfig.collections.historical);
  collections.historical.createIndex(
    { _locationId: 1, _date: -1 },
    { unique: true }
  );

  return client;
}
