import { MongoClient } from 'mongodb'
import { dbConfig } from './config'

class Connection {

  private client: MongoClient
  private connection = null

  constructor() {
    this.client = new MongoClient(dbConfig.uri)
  }

  async connect() {
    if (!this.connection) {
      try {
        this.connection = await this.client.connect()
      } catch (e) {
        console.error(e)
      }
    }

    return this.connection
  }

  async close() {
    return await this.client.close()
  }

  async getCache() {
    const connection = await this.connect()
    const db = connection.db(dbConfig.name)
    const collection = db.collection(dbConfig.collections.cache)

    collection.createIndex({ _location: "2dsphere" })
    collection.createIndex({ _timestamp: -1 }, {
      expireAfterSeconds: dbConfig.options.cacheTtl
    })

    return collection
  }
}

export const connection = new Connection()
