import { Collection } from 'mongodb'
import axios from 'axios'
import joi from 'joi'
import {   dbConfig,   weatherServiceConfig } from './config.js'

export const WeatherQuerySchema = joi.object({
  latitude: joi.number().min(-90).max(90).required(),
  longitude: joi.number().min(-180).max(180).required(),
  date: joi.date().iso().optional(),
}).with("date", ["latitude", "longitude"])

export interface WeatherQuery {
  latitude: number
  longitude: number
  date?: Date
}

export interface WeatherResult {
  location?: {
    name: string
    region: string
    country: string
    latitude: number
    longitude: number
    elevation: number
    timezone: string
    timezone_abbreviation: string
    utc_offset_seconds: number
  }
  current_weather?: {
    temperature: number
    windspeed: number
    winddirection: number
    weathercode: number
    time: string
  }
  hourly_units?: {
    time: string
    temperature_2m: string
    relativehumidity_2m: string
    dewpoint_2m: string
    apparent_temperature: string
    precipitation: string
    weathercode: string
    surface_pressure: string
    cloudcover: string
    visibility: string
    windspeed_10m: string
    winddirection_10m: string
    windgusts_10m: string
    shortwave_radiation: string
  }
  hourly?: {
    time: string[]
    temperature_2m: number[]
    relativehumidity_2m: number[]
    dewpoint_2m: number[]
    apparent_temperature: number[]
    precipitation: number[]
    weathercode: number[]
    surface_pressure: number[]
    cloudcover: number[]
    visibility: number[]
    windspeed_10m: number[]
    winddirection_10m: number[]
    windgusts_10m: number[]
    shortwave_radiation: number[]
  }
  daily_units?: {
    time: string
    weathercode: string
    temperature_2m_max: string
    temperature_2m_min: string
    apparent_temperature_max: string
    apparent_temperature_min: string
    sunrise: string
    sunset: string
    precipitation_sum: string
    precipitation_hours: string
    windspeed_10m_max: string
    windgusts_10m_max: string
    winddirection_10m_dominant: string
    shortwave_radiation_sum: string
  }
  daily?: {
    time: string
    weathercode: number
    temperature_2m_max: number
    temperature_2m_min: number
    apparent_temperature_max: number
    apparent_temperature_min: number
    sunrise: string
    sunset: string
    precipitation_sum: number
    precipitation_hours: number
    windspeed_10m_max: number
    windgusts_10m_max: number
    winddirection_10m_dominant: number
    shortwave_radiation_sum: number
  }
  error?: {
    code: number
    message: string
  }
}

export interface Weather {
  current(query: WeatherQuery): Promise<WeatherResult>
  forecast(query: WeatherQuery): Promise<WeatherResult>
}

export class WeatherService implements Weather {

  public async current(query: WeatherQuery): Promise<WeatherResult> {
    console.log("WeatherService: Handling current() request")
    return this.forecast(query)
  }

  public async forecast(query: WeatherQuery): Promise<WeatherResult> {
    console.log("WeatherService: Handling forecast() request")
    let result = {}
    await axios.all([
      axios.request({
        method: "GET",
        url: weatherServiceConfig.openmeteo.url,
        params: {
          latitude: query.latitude,
          longitude: query.longitude,
          hourly: weatherServiceConfig.openmeteo.variables.hourly.join(","),
          daily: weatherServiceConfig.openmeteo.variables.daily.join(","),
          ...weatherServiceConfig.openmeteo.params
        }
      }),
      axios.request({
        method: "GET",
        url: weatherServiceConfig.weatherapi.url,
        params: {
          q: `${query.latitude},${query.longitude}`,
          lang: weatherServiceConfig.weatherapi.lang,
          days: 0
        },
        headers: {
          "X-RapidAPI-Key": weatherServiceConfig.weatherapi.key,
          "X-RapidAPI-Host": weatherServiceConfig.weatherapi.host
        }
      })
    ])
      .then(axios.spread((res1, res2) => {
        const openmeteo = res1.data
        const weatherapi = res2.data
        result = {
          location: {
            name: weatherapi.location.name,
            region: weatherapi.location.region,
            country: weatherapi.location.country,
            latitude: weatherapi.location.lat,
            longitude: weatherapi.location.lon,
            elevation: openmeteo.elevation,
            timezone: openmeteo.timezone,
            timezone_abbreviation: openmeteo.timezone_abbreviation,
            utc_offset_seconds: openmeteo.utc_offset_seconds,
          },
          current_weather: {
            ...openmeteo.current_weather,
            uv: weatherapi.current.uv,
            is_day: weatherapi.current.is_day
          },
          hourly: openmeteo.hourly,
          hourly_units: openmeteo.hourly_units,
          daily: openmeteo.daily,
          daily_units: openmeteo.daily_units,
        }
      }))
      .catch((e) => {
        console.error(e)
        result = { error : e }
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
    console.log("WeatherCache: Handling current() request")
    let result = await this.findCurrent(query)

    if (!result.current_weather) {
      result = await this.service.current(query)
      this.save(result)
      delete result.hourly
      delete result.hourly_units
      delete result.daily
      delete result.daily_units
    }

    return result
  }

  private async findCurrent(query: WeatherQuery): Promise<WeatherResult> {
    let result = {}
    await this.cache.findOne({
      _location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [query.longitude, query.latitude]
          },
          $maxDistance: dbConfig.options.maxDistance
        }
      }
    }, {
      projection: {
        _id: 0,
        location: 1,
        current_weather: 1
      }
    })
      .then((r) => {
        if (r)
          result = r
      })
      .catch((e) => {
        console.error(e)
        result = { error: e }
      })

    return result
  }

  private async save(weatherResult: WeatherResult): Promise<any> {
    console.log("WeatherCache: Caching the result of request")
    if (!weatherResult.location)
      return

    const { latitude, longitude } = weatherResult.location
    const { time } = weatherResult.current_weather
    const newWeather = {
      _location: {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      _timestamp: new Date(time),
      ...weatherResult
    }

    await this.cache.insertOne(newWeather)
      .then((r) => console.log(r))
      .catch((e) => console.error(e))
  }

  public async forecast(query: WeatherQuery): Promise<WeatherResult> {
    console.log("WeatherCache: Handling forecast() request")
    let result = await this.findForecast(query)

    if (!result.daily) {
      result = await this.service.forecast(query)
      this.save(result)
      delete result.current_weather
    }

    return result
  }

  private async findForecast(query: WeatherQuery): Promise<WeatherResult> {
    let result = {}
    await this.cache.findOne({
      _location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [query.longitude, query.latitude]
          },
          $maxDistance: dbConfig.options.maxDistance
        }
      }
    }, {
      projection: {
        _id: 0,
        _location: 0,
        _timestamp: 0,
        current_weather: 0
      }
    })
      .then((r) => {
        if (r)
          result = r
      })
      .catch((e) => {
        console.error(e)
        result = { error: e }
      })

    return result
  }
}
