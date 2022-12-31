import { MongoClient, Collection } from 'mongodb'
import config from './config.js'

class Connection {

  private client: MongoClient
  private connection = null
  private cache: Collection

  constructor() {
    this.client = new MongoClient(config.weather.db.uri)
  }

  async connect() {
    if (!this.connection) {
      try {
        this.connection = await this.client.connect()
        console.log("Connected to db")
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
    if (!this.cache) {
      const connection = await this.connect()
      const db = connection.db(config.weather.db.name);
      this.cache = db.collection(config.weather.db.collection);
      console.log("Using weather db")
    }

    return this.cache
  }
}

export const connection = new Connection()
