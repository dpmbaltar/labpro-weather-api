import { Collection } from 'mongodb';
import axios from 'axios';
import joi from 'joi';
import { dbConfig, weatherServiceConfig } from './config';

export const WeatherQuerySchema = joi.object({
  latitude: joi.number().min(-90).max(90).required(),
  longitude: joi.number().min(-180).max(180).required(),
  days: joi.number().min(1).max(30).optional(),
  date: joi.date().iso().optional()
});

export interface WeatherQuery {
  latitude: number;
  longitude: number;
  days?: number;
  date?: Date;
}

export interface Location {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  timezone_abbreviation: string;
  utc_offset_seconds: number;
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  feelslike: number;
  humidity: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  uv: number;
  is_day: number;
}

export interface HourlyWeatherUnits {
  time: string;
  temperature_2m: string;
  relativehumidity_2m: string;
  dewpoint_2m: string;
  apparent_temperature: string;
  precipitation: string;
  weathercode: string;
  surface_pressure: string;
  cloudcover: string;
  visibility: string;
  windspeed_10m: string;
  winddirection_10m: string;
  windgusts_10m: string;
}

export interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  relativehumidity_2m: number[];
  dewpoint_2m: number[];
  apparent_temperature: number[];
  precipitation: number[];
  weathercode: number[];
  surface_pressure: number[];
  cloudcover: number[];
  visibility: number[];
  windspeed_10m: number[];
  winddirection_10m: number[];
  windgusts_10m: number[];
}

export interface DailyWeatherUnits {
  time: string;
  weathercode: string;
  temperature_2m_max: string;
  temperature_2m_min: string;
  apparent_temperature_max: string;
  apparent_temperature_min: string;
  sunrise: string;
  sunset: string;
  precipitation_sum: string;
  precipitation_hours: string;
  windspeed_10m_max: string;
  windgusts_10m_max: string;
  winddirection_10m_dominant: string;
}

export interface DailyWeather {
  time: string;
  weathercode: number;
  temperature_2m_max: number;
  temperature_2m_min: number;
  apparent_temperature_max: number;
  apparent_temperature_min: number;
  sunrise: string;
  sunset: string;
  precipitation_sum: number;
  precipitation_hours: number;
  windspeed_10m_max: number;
  windgusts_10m_max: number;
  winddirection_10m_dominant: number;
}

export interface Weather {
  location?: Location;
  current?: CurrentWeather;
  daily?: DailyWeather;
  daily_units?: DailyWeatherUnits;
  hourly?: HourlyWeather;
  hourly_units?: HourlyWeatherUnits;
  error?: any;
}

export interface WeatherForecast {
  current(query: WeatherQuery): Promise<Weather>;
  daily(query: WeatherQuery): Promise<Weather>;
  hourly(query: WeatherQuery): Promise<Weather>;
}

export class WeatherForecastService implements WeatherForecast {

  private request = {
    forecast: {
      openmeteo: {
        method: 'GET',
        url: weatherServiceConfig.openmeteo.url,
        params: {
          latitude: NaN,
          longitude: NaN,
          hourly: weatherServiceConfig.openmeteo.variables.hourly.join(','),
          daily: weatherServiceConfig.openmeteo.variables.daily.join(','),
          current_weather: 'true',
          timezone: 'auto'
        }
      },
      weatherapi: {
        method: 'GET',
        url: weatherServiceConfig.weatherapi.url,
        params: {
          q: '',
          lang: weatherServiceConfig.weatherapi.lang,
          days: 0
        },
        headers: {
          'X-RapidAPI-Key': weatherServiceConfig.weatherapi.key,
          'X-RapidAPI-Host': weatherServiceConfig.weatherapi.host
        }
      }
    }
  };

  public current(query: WeatherQuery): Promise<Weather> {
    console.log('WeatherForecastService: Handling current() request');
    return this.forecast(query);
  }

  public daily(query: WeatherQuery): Promise<Weather> {
    console.log('WeatherForecastService: Handling daily() request');
    return this.forecast(query);
  }

  public hourly(query: WeatherQuery): Promise<Weather> {
    console.log('WeatherForecastService: Handling hourly() request');
    return this.forecast(query);
  }

  private forecast(query: WeatherQuery): Promise<Weather> {
    return new Promise<Weather>((resolve, reject) => {
      const openmeteo = Object.assign({}, this.request.forecast.openmeteo);
      const weatherapi = Object.assign({}, this.request.forecast.weatherapi);

      openmeteo.params.latitude = query.latitude;
      openmeteo.params.longitude = query.longitude;
      weatherapi.params.q = `${query.latitude},${query.longitude}`;

      axios.all([
        axios.request(openmeteo),
        axios.request(weatherapi)
      ])
        .then(axios.spread((response1, response2) => {
          const openmeteo = response1.data;
          const weatherapi = response2.data;
          const weather = {
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
            current: {
              ...openmeteo.current_weather,
              feelslike: weatherapi.current.feelslike_c,
              humidity: weatherapi.current.humidity,
              uv: weatherapi.current.uv,
              is_day: weatherapi.current.is_day
            },
            daily: openmeteo.daily,
            daily_units: openmeteo.daily_units,
            hourly: openmeteo.hourly,
            hourly_units: openmeteo.hourly_units
          };

          resolve(weather);
        }))
        .catch((error) => {
          console.error(error);
          reject(error);
        });
    });
  }

}

export class WeatherForecastCache implements WeatherForecast {

  private cache: Collection;
  private service: WeatherForecastService;

  constructor(
    cacheCollection: Collection,
    weatherForecastService: WeatherForecastService
  ) {
    this.cache = cacheCollection;
    this.service = weatherForecastService;
  }

  public current(query: WeatherQuery): Promise<Weather> {
    console.log('WeatherForecastCache: Handling current() request');
    return new Promise<Weather>((resolve, reject) => {
      this.findWeather(query, {
        location: 1,
        current: 1,
        _id: 0
      })
        .then(result => {
          if (result) {
            resolve(result);
          } else {
            this.service.current(query)
              .then(result => {
                this.save(result);
                resolve({
                  location: result.location,
                  current: result.current
                });
              })
              .catch(error => {
                reject(error);
              });
          }
        });
    });
  }

  private save(weather: Weather): Promise<any> {
    console.log('WeatherForecastCache: Caching the result of weather request');
    return new Promise<any>((resolve, reject) => {
      if (!weather || !weather.location)
        return resolve({ acknowledged: false });

      const { latitude, longitude } = weather.location;
      const { time } = weather.current;
      const _weather = {
        _location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        _timestamp: new Date(time),
        ...weather
      };

      this.cache.insertOne(_weather)
        .then(result => {
          console.log(result);
          resolve(result);
        })
        .catch(error => {
          console.error(error);
          reject(error);
        });
    });
  }

  public daily(query: WeatherQuery): Promise<Weather> {
    console.log('WeatherForecastCache: Handling daily() request');
    return new Promise<Weather>((resolve, reject) => {
      this.findWeather(query, {
        location: 1,
        daily: 1,
        daily_units: 1,
        _id: 0
      })
        .then(result => {
          if (result) {
            resolve(result);
          } else {
            this.service.current(query)
              .then(result => {
                this.save(result);
                resolve({
                  location: result.location,
                  daily: result.daily,
                  daily_units: result.daily_units
                });
              })
              .catch(error => {
                reject(error);
              });
          }
        });
    });
  }

  public hourly(query: WeatherQuery): Promise<Weather> {
    console.log('WeatherForecastCache: Handling hourly() request');
    return new Promise<Weather>(async (resolve, reject) => {
      if (!query.date)
        return reject({ error: { code: 400, reason: 'Undefined date' } });

      const date = query.date;
      const today = new Date();
      let day = 0;
      day += Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      day -= Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      day /= 1000 * 60 * 60 * 24;

      if (day < 0 || day > 7)
        return reject({ error: { code: 400, reason: 'Date is out of range' } });

      const start = day * 24;
      const end = start + 24;

      this.findWeather(query, {
        location: 1,
        "hourly.time": { $slice: [start, 24] },
        "hourly.temperature_2m": { $slice: [start, 24] },
        "hourly.relativehumidity_2m": { $slice: [start, 24] },
        "hourly.dewpoint_2m": { $slice: [start, 24] },
        "hourly.apparent_temperature": { $slice: [start, 24] },
        "hourly.precipitation": { $slice: [start, 24] },
        "hourly.weathercode": { $slice: [start, 24] },
        "hourly.surface_pressure": { $slice: [start, 24] },
        "hourly.cloudcover": { $slice: [start, 24] },
        "hourly.visibility": { $slice: [start, 24] },
        "hourly.windspeed_10m": { $slice: [start, 24] },
        "hourly.winddirection_10m": { $slice: [start, 24] },
        "hourly.windgusts_10m": { $slice: [start, 24] },
        hourly_units: 1,
        _id: 0
      })
        .then(result => {
          if (result) {
            resolve(result);
          } else {
            this.service.hourly(query)
              .then(result => {
                this.save(result)
                  .then(saved => {
                    Object.keys(result.hourly).forEach(key => {
                      result.hourly[key] = result.hourly[key].slice(start, end);
                    });
                    resolve({
                      location: result.location,
                      hourly: result.hourly,
                      hourly_units: result.hourly_units
                    });
                  });
              })
              .catch(error => {
                reject(error);
              });
          }
        });
    });
  }

  private findWeather(
    query: WeatherQuery,
    projection = {}
  ): Promise<Weather> {
    return new Promise<Weather>((resolve, reject) => {
      this.cache.findOne<Weather>({
        _location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [query.longitude, query.latitude]
            },
            $maxDistance: dbConfig.options.maxDistance
          }
        }
      }, { projection: projection })
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          console.error(error);
          reject({ error: error });
        })
    })
  }

}
