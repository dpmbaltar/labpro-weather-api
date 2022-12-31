import { MongoClient, Collection } from 'mongodb'
import axios from 'axios'
import joi, { number } from 'joi'
import config from './config.js'

export const WeatherQuerySchema = joi.object({
  latitude: joi.number().min(-90).max(90).required(),
  longitude: joi.number().min(-180).max(180).required(),
  date: joi.date().iso().optional(),
}).with('date', ['latitude', 'longitude'])

export interface WeatherQuery {
  latitude: Number
  longitude: Number
  date?: Date
  lang?: String
}

export interface WeatherResult {
  weather: {
    location: {
      name: String
      region: String
      country: String
      lat: Number
      lon: Number
      localtime: Date
    }
    current: object
    forecast: object
  }
  error?: any
}

export interface Weather {
  current(query: WeatherQuery): Promise<WeatherResult>
  forecast(query: WeatherQuery): Promise<WeatherResult>
}

/**
 * WeatherAPI Service
 */
export class WeatherService implements Weather {

  public async current(query: WeatherQuery): Promise<WeatherResult> {
    console.log('WeatherService: Handling current() request')
    return this.forecast(query)
  }

  public async forecast(query: WeatherQuery): Promise<WeatherResult> {
    console.log('WeatherService: Handling forecast() request')
    const result = { weather: null, error: null }
    const options = {
      method: 'GET',
      url: config.weather.service.url,
      params: {
        q: `${query.latitude},${query.longitude}`,
        days: config.weather.service.days,
        lang: query.lang || config.weather.service.lang
      },
      headers: {
        'X-RapidAPI-Key': config.weather.service.key,
        'X-RapidAPI-Host': config.weather.service.host
      }
    }
    await axios.request(options)
      .then((response) => result.weather = response.data)
      .catch((error) => {
        result.error = error
        console.error(error)
      })

    return result
  }
}

export class WeatherCache implements Weather {

  private cache: Collection
  private service: WeatherService

  constructor(cacheCollection, weatherService: WeatherService) {
    this.cache = cacheCollection
    this.service = weatherService
  }

  public async current(query: WeatherQuery): Promise<WeatherResult> {
    console.log('WeatherCache: Handling current() request')
    let result = await this.findCurrent(query)

    if (!result.weather) {
      result = await this.service.current(query)
      this.saveCurrent(result)
    }

    return result
  }

  private async findCurrent(query: WeatherQuery): Promise<WeatherResult> {
    const result = { weather: null, error: null }
    await this.cache.findOne({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [query.longitude, query.latitude]
          },
          $maxDistance: config.weather.options.maxDistance
        }
      }
    }, { projection: { _id: 0, location: 0, "weather.forecast": 0 } })
      .then((r) => result.weather = r.weather)
      .catch((e) => {
        result.error = e
        console.error(e)
      })

    return result
  }

  private async saveCurrent(weatherResult: WeatherResult): Promise<any> {
    console.log('WeatherCache: Caching the result of request')
    if (!weatherResult.weather)
      return

    const { weather } = weatherResult
    const { localtime, lat, lon } = weather.location
    const newWeather = {
      location: {
        type: "Point",
        coordinates: [lon, lat]
      },
      weather: weather,
      timestamp: new Date(localtime)
    }
    await this.cache.insertOne(newWeather)
      .then((result) => console.log(result))
      .catch((e) => console.error(e))
  }

  public forecast(query: WeatherQuery): Promise<WeatherResult> {
    console.log('WeatherCache: Handling current() request')
    return null
  }

  private async findForecast(): Promise<WeatherResult> {
    return null
  }
}
