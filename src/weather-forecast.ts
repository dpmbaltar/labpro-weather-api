import { Collection } from 'mongodb';
import axios from 'axios';
import joi from 'joi';
import { dbConfig, weatherServiceConfig } from './config';

export const WeatherQuerySchema = joi.object({
  latitude: joi.number().min(-90).max(90).required(),
  longitude: joi.number().min(-180).max(180).required(),
  days: joi.number().min(-30).max(30).optional(),
  date: joi.date().iso().optional(),
  withLocation: joi.boolean().optional()
});

export interface WeatherQuery {
  latitude: number;
  longitude: number;
  days?: number;
  date?: Date;
  withLocation?: boolean;
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
  conditionText: string;
  conditionIcon: number;
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
  conditionText: string;
  conditionIcon: number;
}

export interface HourlyWeather {
  time: string[];
  temperature: number[];
  apparentTemperature: number[];
  precipitation: number[];
  relativeHumidity: number[];
  dewPoint: number[];
  cloudCover: number[];
  surfacePressure: number[];
  windSpeed: number[];
  windDirection: number[];
  windGusts: number[];
  conditionText: string[];
  conditionIcon: number[];
}

export interface WeatherCondition {
  code: number;
  icon: number;
  day: string;
  night: string;
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
  history(query: WeatherQuery): Promise<Weather>;
}

const DailyWeatherFields = [
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'apparent_temperature_min',
  'sunrise',
  'sunset',
  'precipitation_sum',
  'precipitation_hours',
  'windspeed_10m_max',
  'windgusts_10m_max',
  'winddirection_10m_dominant',
  'weathercode'
];

const HourlyWeatherFields = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'relativehumidity_2m',
  'dewpoint_2m',
  'cloudcover',
  'surface_pressure',
  'windspeed_10m',
  'winddirection_10m',
  'windgusts_10m',
  'weathercode'
];

export class WeatherForecastService implements WeatherForecast {

  private conditions = new Map<number, WeatherCondition>;

  private request = {
    forecast: {
      openmeteo: {
        method: 'GET',
        url: 'https://api.open-meteo.com/v1/forecast',
        params: {
          latitude: NaN,
          longitude: NaN,
          timezone: 'auto',
          current_weather: 'true',
          daily: DailyWeatherFields.join(','),
          hourly: HourlyWeatherFields.join(',')
        }
      },
      weatherapi: {
        method: 'GET',
        url: 'https://weatherapi-com.p.rapidapi.com/forecast.json',
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
    },
    history: function(
      latitude: number,
      longitude: number,
      startDate: Date,
      endDate: Date
    ) {
      return [
        {
          method: 'GET',
          url: 'https://archive-api.open-meteo.com/v1/archive',
          params: {
            latitude: latitude,
            longitude: longitude,
            start_date: startDate.toISOString().substring(0, 10),
            end_date: endDate.toISOString().substring(0, 10),
            timezone: 'auto',
            daily: DailyWeatherFields.join(','),
            hourly: HourlyWeatherFields.join(',')
          }
        },
        {
          method: 'GET',
          url: 'https://weatherapi-com.p.rapidapi.com/forecast.json',
          params: {
            q: `${latitude},${longitude}`,
            lang: weatherServiceConfig.weatherapi.lang,
            days: 0
          },
          headers: {
            'X-RapidAPI-Key': weatherServiceConfig.weatherapi.key,
            'X-RapidAPI-Host': weatherServiceConfig.weatherapi.host
          }
        }
      ];
    }
  };

  constructor(weatherConditions: WeatherCondition[]) {
    weatherConditions.forEach(condition => {
      this.conditions.set(condition.code, condition);
    });
  }

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
            location: this.buildWeatherLocation(openmeteo, weatherapi),
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
              conditionText: this.conditionText(
                openmeteo.current_weather.weathercode,
                weatherapi.current.is_day > 0
              ),
              conditionIcon: this.conditionIcon(
                openmeteo.current_weather.weathercode
              )
            },
            daily: this.buildDailyWeather(openmeteo.daily, 7),
            hourly: this.buildHourlyWeather(openmeteo.hourly, 7)
          };

          resolve(weather);
        }))
        .catch((error) => {
          console.error(error);
          reject(error);
        });
    });
  }

  /**
   * Fetches history weather from the OpenMeteo History API.
   * Requires the following fields from a WeatherQuery: latitude, longitude,
   * date, days and withLocation. Latitude and longitude are used for location.
   * The date should be at least 7 days earlier than yesterday. If the number of
   * days is positive, date is the start date and date + days is the end date.
   * If the number of days is negative, date is the end date and date - days is
   * the start date. Note: some fields have been found to be null for dates
   * closer than 10 days to today, even though the API mentions a 5 day offset
   * from today backwards should be queried. Finally, if withLocation is true,
   * the location object is included in the response.
   *
   * @param weatherQuery the weather query
   * @returns a Weather promise
   */
  history(weatherQuery: WeatherQuery): Promise<Weather> {
    console.log('WeatherForecastService: Handling history() request');
    return new Promise<Weather>((resolve, reject) => {
      const { latitude, longitude, days, date, withLocation } = weatherQuery;
      const today = new Date();
      const maxDays = 62;
      const offsetDays = 7;
      const offsetTime = offsetDays * 24*60*60*1000;
      let start: Date, end: Date, totalDays: number;

      if (days > 0) {
        start = new Date(date.getTime());
        end = new Date(date.getTime());
        end.setDate(end.getDate() + Math.min(maxDays, days - 1));
      } else if (days < 0) {
        end = new Date(date.getTime());
        start = new Date(date.getTime());
        start.setDate(start.getDate() + Math.max(-maxDays, days + 1));
      } else {
        return reject({ error: `Invalid days number (${days})` });
      }

      if (today.getTime() <= start.getTime() ||
          today.getTime() - offsetTime < end.getTime()) {
        return reject({
          error: `Invalid date/days values (${date.toISOString()}/${days})`
        });
      }

      totalDays = end.getTime() - start.getTime();
      totalDays/= 24*60*60*1000;
      totalDays = Math.round(totalDays + 1);

      const requests = this.request.history(latitude, longitude, start, end);
      if (!withLocation)
        requests.splice(-1);

      axios.all(requests.map(request => axios.request(request)))
        .then(axios.spread((...responses) => {
          const openmeteo = responses[0].data;
          const weather = {
            daily: this.buildDailyWeather(openmeteo.daily, totalDays)
              .sort((a, b) => {
                const timeA = (new Date(a.time)).getTime();
                const timeB = (new Date(b.time)).getTime();
                return timeB - timeA;
              })
          };

          if (withLocation) {
            const weatherapi = responses[1].data;
            weather['location'] = this.buildWeatherLocation(openmeteo, weatherapi);
          }

          resolve(weather);
        }))
        .catch((error) => {
          console.error(error);
          reject(error);
        });
    });
  }

  private buildWeatherLocation(openmeteo, weatherapi) {
    return {
      name: weatherapi.location.name,
      region: weatherapi.location.region,
      country: weatherapi.location.country,
      latitude: weatherapi.location.lat,
      longitude: weatherapi.location.lon,
      elevation: openmeteo.elevation,
      timezone: openmeteo.timezone,
      timezoneAbbreviation: openmeteo.timezone_abbreviation,
      utcOffsetSeconds: openmeteo.utc_offset_seconds
    };
  }

  private buildDailyWeather(daily, days: number) {
    const dailyWeather = [];

    for (let i = 0; i < days; i++) {
      if (daily.weathercode[i] == null)
        break;

      dailyWeather.push({
        time: daily.time[i],
        temperatureMax: daily.temperature_2m_max[i] || 0,
        temperatureMin: daily.temperature_2m_min[i] || 0,
        apparentTemperatureMax: daily.apparent_temperature_max[i] || 0,
        apparentTemperatureMin: daily.apparent_temperature_min[i] || 0,
        sunrise: daily.sunrise[i],
        sunset: daily.sunset[i],
        precipitationSum: daily.precipitation_sum[i] || 0,
        precipitationHours: daily.precipitation_hours[i] || 0,
        windSpeedMax: daily.windspeed_10m_max[i] || 0,
        windGustsMax: daily.windgusts_10m_max[i] || 0,
        windDirection: daily.winddirection_10m_dominant[i] || 0,
        conditionText: this.conditionText(daily.weathercode[i]),
        conditionIcon: this.conditionIcon(daily.weathercode[i])
      });
    }

    return dailyWeather;
  }

  private buildHourlyWeather(openmeteoHourly, days: number) {
    const hourlyWeather = [];

    for (let i = 0; i < days; i++) {
      const start = i * 24;
      const end = start + 24;
      const weatherCodes = openmeteoHourly.weathercode.slice(start, end);
      const conditionTexts = weatherCodes.map(code => this.conditionText(code));
      const conditionIcons = weatherCodes.map(code => this.conditionIcon(code));

      hourlyWeather.push({
        time: openmeteoHourly.time.slice(start, end),
        temperature: openmeteoHourly.temperature_2m.slice(start, end),
        apparentTemperature: openmeteoHourly.apparent_temperature.slice(start, end),
        precipitation: openmeteoHourly.precipitation.slice(start, end),
        relativeHumidity: openmeteoHourly.relativehumidity_2m.slice(start, end),
        dewPoint: openmeteoHourly.dewpoint_2m.slice(start, end),
        cloudCover: openmeteoHourly.cloudcover.slice(start, end),
        surfacePressure: openmeteoHourly.surface_pressure.slice(start, end),
        windSpeed: openmeteoHourly.windspeed_10m.slice(start, end),
        windDirection: openmeteoHourly.winddirection_10m.slice(start, end),
        windGusts: openmeteoHourly.windgusts_10m.slice(start, end),
        conditionText: conditionTexts,
        conditionIcon: conditionIcons
      });
    }

    return hourlyWeather;
  }

  private conditionText(weatherCode: number, isDay: boolean = true) {
    let condition = this.conditions.get(weatherCode);
    if (condition == null)
      condition = this.conditions.get(-1);

    return isDay ? condition.day : condition.night;
  }

  private conditionIcon(weatherCode: number) {
    let condition = this.conditions.get(weatherCode);
    if (condition == null)
      condition = this.conditions.get(-1);

    return condition.icon;
  }

}

export class WeatherForecastCache implements WeatherForecast {

  constructor(
    private cache: Collection,
    private location: Collection,
    private historical: Collection,
    private service: WeatherForecastService
  ) {}

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
        });
    });
  }

  /**
   * Attempts to retrieve the requested weather from database, otherwise uses
   * the weather service to fullfill the request, and then saves the results for
   * future requests.
   *
   * For caching purposes, start and end dates are modified to retrieve a whole
   * month or two when using the weather service. For example, if start date and
   * end date is in the same month, the whole month is retrieved. If the start
   * and end date are in different months, the two whole months are retrieved,
   * except when the last month is the current month, then the end date is today
   * - 7 days.
   *
   * @param weatherQuery the weather query
   * @returns the Weather promise
   */
  history(weatherQuery: WeatherQuery): Promise<Weather> {
    console.log('WeatherForecastCache: Handling history() request');
    return new Promise<Weather>((resolve, reject) => {
      const { days, date, withLocation } = weatherQuery;
      const today = new Date();
      const maxDays = 7;
      const offsetDays = 7;
      const offsetTime = offsetDays * 24*60*60*1000;
      const limit = new Date(today.getTime());
      limit.setUTCHours(0);
      limit.setUTCMinutes(0);
      limit.setUTCSeconds(0);
      limit.setUTCMilliseconds(0);
      limit.setTime(limit.getTime() - 7*24*60*60*1000);
      let start: Date, end: Date, totalDays: number;

      if (days > 0) {
        start = new Date(date.getTime());
        end = new Date(date.getTime());
        end.setDate(end.getDate() + Math.min(maxDays, days - 1));
      } else if (days < 0) {
        end = new Date(date.getTime());
        start = new Date(date.getTime());
        start.setDate(start.getDate() + Math.max(-maxDays, days + 1));
      } else {
        return reject({ error: `Invalid days number (${days})` });
      }

      if (today.getTime() <= start.getTime() ||
          today.getTime() - offsetTime < end.getTime()) {
        return reject({
          error: `Invalid date/days values (${date.toISOString()}/${days})`
        });
      }

      this.findHistorical(weatherQuery, start, end)
        .then(result => {
          if (result) {
            console.log('Location found');
            let fillStart: Date, fillEnd: Date;

            if (result.daily && result.daily.length > 0) {
              const { daily } = result;
              const foundStart = new Date(daily[daily.length - 1].time);
              const foundEnd = new Date(daily[0].time);

              console.log('Weather found');
              console.log({
                givenStart: start.toISOString(),
                givenEnd: end.toISOString(),
                foundStart: foundStart.toISOString(),
                foundEnd: foundEnd.toISOString()
              });

              if (start.getTime() < foundStart.getTime()) {
                console.log('Fill start');
                fillStart = new Date(start.getTime());
                fillStart.setUTCDate(1);
                fillEnd = new Date(start.getTime());
                fillEnd.setUTCDate(1);
                fillEnd.setUTCMonth(fillEnd.getUTCMonth() + 1);
                fillEnd.setUTCDate(0);
              } else if (end.getTime() > foundEnd.getTime()) {
                console.log('Fill end');
                const startLimit = foundEnd.getTime() + 24*60*60*1000;
                fillStart = new Date(end.getTime());
                fillStart.setUTCDate(1);
                fillStart.setTime(Math.max(fillStart.getTime(), startLimit));
                fillEnd = new Date(end.getTime());
                fillEnd.setUTCDate(1);
                fillEnd.setUTCMonth(fillEnd.getUTCMonth() + 1);
                fillEnd.setUTCDate(0);
                fillEnd.setTime(Math.min(fillEnd.getTime(), limit.getTime()));
              }
            } else {
              console.log('Fill start-end');
              fillStart = new Date(start.getTime());
              fillStart.setUTCDate(1);
              fillEnd = new Date(end.getTime());
              fillEnd.setUTCDate(1);
              fillEnd.setUTCMonth(fillEnd.getUTCMonth() + 1);
              fillEnd.setUTCDate(0);
              fillEnd.setTime(Math.min(fillEnd.getTime(), limit.getTime()));
            }

            console.log({
              fillStart: fillStart,
              fillEnd: fillEnd
            });

            if (fillStart) {
              console.log('Filling...');
              totalDays = fillEnd.getTime() - fillStart.getTime();
              totalDays/= 24*60*60*1000;
              totalDays = Math.round(totalDays + 1);
              weatherQuery['date'] = fillStart;
              weatherQuery['days'] = totalDays;
              weatherQuery['withLocation'] = true;
              console.log(weatherQuery);

              return this.service.history(weatherQuery)
                .then(weather => {
                  this.saveHistorical(weather)
                    .finally(() => {
                      if (!withLocation)
                        delete weather.location;

                      weather.daily = weather.daily.filter(daily => {
                        const dailyTime = new Date(daily.time).getTime();
                        const startTime = start.getTime();
                        const endTime = end.getTime();
                        return startTime <= dailyTime && dailyTime <= endTime;
                      });

                      result.daily.push(...weather.daily);
                      result.daily = result.daily.sort((a, b) => {
                        const timeA = (new Date(a.time)).getTime();
                        const timeB = (new Date(b.time)).getTime();
                        return timeB - timeA;
                      });

                      resolve(result);
                    });
                })
                .catch(error => reject(error));
            }

            resolve(result);
          } else {
            console.log('Location not found');
            const newEnd = new Date(end.getTime());
            const newStart = new Date(start.getTime());
            newStart.setUTCDate(1);

            if (newEnd.getUTCFullYear() == today.getUTCFullYear() &&
                newEnd.getUTCMonth() == today.getUTCMonth()) {
              newEnd.setUTCMonth(today.getUTCMonth());
              newEnd.setUTCDate(today.getUTCDate() - offsetDays);
            } else {
              newEnd.setUTCDate(1);
              newEnd.setUTCMonth(newEnd.getUTCMonth() + 1);
              newEnd.setUTCDate(0);
              newEnd.setTime(Math.min(newEnd.getTime(), limit.getTime()));
            }

            totalDays = newEnd.getTime() - newStart.getTime();
            totalDays/= 24*60*60*1000;
            totalDays = Math.round(totalDays + 1);
            weatherQuery['date'] = newStart;
            weatherQuery['days'] = totalDays;
            weatherQuery['withLocation'] = true;

            this.service.history(weatherQuery)
              .then(weather => {
                this.saveHistorical(weather)
                  .finally(() => {
                    weather.daily = weather.daily.filter(daily => {
                      const dailyTime = new Date(daily.time).getTime();
                      const startTime = start.getTime();
                      const endTime = end.getTime();
                      return startTime <= dailyTime && dailyTime <= endTime;
                    });

                    if (!withLocation)
                      delete weather.location;

                    resolve(weather);
                  });
              })
              .catch(error => reject(error));
          }
        })
        .catch(error => reject(error));
    });
  }

  private findHistorical(
    query: WeatherQuery,
    from: Date,
    to: Date
  ): Promise<Weather> {
    return new Promise<Weather>((resolve, reject) => {
      const projectLocation = !query.withLocation ? {} : {
        'location.name': '$name',
        'location.region': '$region',
        'location.country': '$country',
        'location.latitude': '$latitude',
        'location.longitude': '$longitude',
        'location.elevation': '$elevation',
        'location.timezone': '$timezone',
        'location.timezoneAbbreviation': '$timezoneAbbreviation',
        'location.utcOffsetSeconds': '$utcOffsetSeconds'
      };
      const aggregation = [
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [query.longitude, query.latitude]
            },
            distanceField: '_location',
            maxDistance: 5000,
            spherical: true
          }
        },
        {
          $limit: 1
        },
        {
          $lookup: {
            from: 'historical',
            localField: '_id',
            foreignField: '_locationId',
            as: 'daily',
            pipeline: [
              { $match: { _date: { $gte: from, $lte: to } } },
              { $sort: { _date: -1 } }
            ]
          }
        },
        {
          $project: {
            'daily': 1,
            ...projectLocation
          }
        },
        {
          $project: {
            '_id': 0,
            'daily._id': 0,
            'daily._locationId': 0,
            'daily._date': 0
          }
        }
      ];

      this.location.aggregate(aggregation).next()
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          console.error(error);
          reject({ error: error });
        });
    });
  }

  private saveHistorical(weather: Weather): Promise<any> {
    console.log('WeatherForecastCache: Caching the result of history request');
    return new Promise<any>((resolve, reject) => {
      this.saveLocation(weather.location)
        .then(result => {
          const locationId = result._id;
          const daily = weather.daily.map(weather => {
            return {
              _locationId: locationId,
              _date: new Date(weather.time),
              ...weather
            };
          });

          this.historical.insertMany(daily)
            .then(result => resolve(result))
            .catch(error => {
              console.error(error);
              reject({ error: error });
            });
        })
        .catch(error => {
          console.error(error);
          reject({ error: error });
        });
    });
  }

  private saveLocation(location: WeatherLocation): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const { latitude, longitude } = location;

      this.location.findOne<Weather>({
        _location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: dbConfig.options.maxDistance
          }
        }
      }, { projection: { _id: 1 } })
        .then(result => {
          if (result) {
            resolve(result);
          } else {
            const newLocation = {
              _location: {
                type: 'Point',
                coordinates: [longitude, latitude]
              },
              ...location
            };

            this.location.insertOne(newLocation)
              .then(result => {
                console.log(result);
                resolve({ _id: result.insertedId });
              })
              .catch(error => {
                console.error(error);
                reject(error);
              });
          }
        })
        .catch(error => {
          console.error(error);
          reject({ error: error });
        });
    });
  }

}
