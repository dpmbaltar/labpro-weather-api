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

export interface WeatherLocation {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  timezoneAbbreviation: string;
  utcOffsetSeconds: number;
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  uv: number;
  isDay: boolean;
  weatherCode: number;
}

export interface DailyWeather {
  time: string;
  temperatureMax: number;
  temperatureMin: number;
  apparentTemperatureMax: number;
  apparentTemperatureMin: number;
  sunrise: string;
  sunset: string;
  precipitationSum: number;
  precipitationHours: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirection: number;
  weatherCode: number;
}

export interface HourlyWeather {
  time: string[];
  temperature: number[];
  apparentTemperature: number[];
  precipitation: number[];
  relativeHumidity: number[];
  dewPoint: number[];
  cloudCover: number[];
  visibility: number[];
  surfacePressure: number[];
  windSpeed: number[];
  windDirection: number[];
  windGusts: number[];
  weatherCode: number[];
}

export interface Weather {
  location?: WeatherLocation;
  current?: CurrentWeather;
  daily?: DailyWeather[];
  hourly?: HourlyWeather[];
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
          timezone: 'auto',
          current_weather: 'true',
          daily: [
            "temperature_2m_max",
            "temperature_2m_min",
            "apparent_temperature_max",
            "apparent_temperature_min",
            "sunrise",
            "sunset",
            "precipitation_sum",
            "precipitation_hours",
            "windspeed_10m_max",
            "windgusts_10m_max",
            "winddirection_10m_dominant",
            "weathercode"
          ].join(','),
          hourly: [
            "temperature_2m",
            "apparent_temperature",
            "precipitation",
            "relativehumidity_2m",
            "dewpoint_2m",
            "cloudcover",
            "visibility",
            "surface_pressure",
            "windspeed_10m",
            "winddirection_10m",
            "windgusts_10m",
            "weathercode"
          ].join(',')
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
              timezoneAbbreviation: openmeteo.timezone_abbreviation,
              utcOffsetSeconds: openmeteo.utc_offset_seconds,
            },
            current: {
              time: openmeteo.current_weather.time,
              temperature: openmeteo.current_weather.temperature,
              apparentTemperature: weatherapi.current.feelslike_c,
              precipitation: weatherapi.current.precip_mm,
              humidity: weatherapi.current.humidity,
              windSpeed: openmeteo.current_weather.windspeed,
              windDirection: openmeteo.current_weather.winddirection,
              uv: weatherapi.current.uv,
              isDay: weatherapi.current.is_day > 0 ? true : false,
              weatherCode: openmeteo.current_weather.weathercode
            },
            daily: this.mapDailyWeather(openmeteo.daily),
            hourly: this.mapHourlyWeather(openmeteo.hourly)
          };

          resolve(weather);
        }))
        .catch((error) => {
          console.error(error);
          reject(error);
        });
    });
  }

  private mapDailyWeather(openMeteoDaily) {
    const dailyWeather = [];

    for (let i = 0; i < 7; i++) {
      dailyWeather.push({
        time: openMeteoDaily.time[i],
        temperatureMax: openMeteoDaily.temperature_2m_max[i],
        temperatureMin: openMeteoDaily.temperature_2m_min[i],
        apparentTemperatureMax: openMeteoDaily.apparent_temperature_max[i],
        apparentTemperatureMin: openMeteoDaily.apparent_temperature_min[i],
        sunrise: openMeteoDaily.sunrise[i],
        sunset: openMeteoDaily.sunset[i],
        precipitationSum: openMeteoDaily.precipitation_sum[i],
        precipitationHours: openMeteoDaily.precipitation_hours[i],
        windSpeedMax: openMeteoDaily.windspeed_10m_max[i],
        windGustsMax: openMeteoDaily.windgusts_10m_max[i],
        windDirection: openMeteoDaily.winddirection_10m_dominant[i],
        weatherCode: openMeteoDaily.weathercode[i]
      });
    }

    return dailyWeather;
  }

  private mapHourlyWeather(openMeteoHourly) {
    const hourlyWeather = [];

    for (let i = 0; i < 7; i++) {
      const start = i * 24;
      const end = start + 24;
      hourlyWeather.push({
        time: openMeteoHourly.time.slice(start, end),
        temperature: openMeteoHourly.temperature_2m.slice(start, end),
        apparentTemperature: openMeteoHourly.apparent_temperature.slice(start, end),
        precipitation: openMeteoHourly.precipitation.slice(start, end),
        relativeHumidity: openMeteoHourly.relativehumidity_2m.slice(start, end),
        dewPoint: openMeteoHourly.dewpoint_2m.slice(start, end),
        cloudCover: openMeteoHourly.cloudcover.slice(start, end),
        visibility: openMeteoHourly.visibility.slice(start, end),
        surfacePressure: openMeteoHourly.surface_pressure.slice(start, end),
        windSpeed: openMeteoHourly.windspeed_10m.slice(start, end),
        windDirection: openMeteoHourly.winddirection_10m.slice(start, end),
        windGusts: openMeteoHourly.windgusts_10m.slice(start, end),
        weatherCode: openMeteoHourly.weathercode.slice(start, end)
      });
    }

    return hourlyWeather;
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
                  daily: result.daily
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
        return reject({ error: 'Valid date is required' });

      const date = query.date;
      const today = new Date();
      let day = 0;
      day += Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      day -= Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      day /= 1000 * 60 * 60 * 24;
      day = Math.round(day);

      if (day < 0 || day > 6)
        return reject({ error: 'Date is out of range' });

      this.findWeather(query, {
        location: 1,
        hourly: { $slice: [day, 1] },
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
                    resolve({
                      location: result.location,
                      hourly: result.hourly.slice(day, 1)
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
