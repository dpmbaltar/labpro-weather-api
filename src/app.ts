import fs from 'fs';
import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as db from './connection';
import {
  WeatherForecastCache,
  WeatherForecastService,
  WeatherQuerySchema
} from './weather-forecast';

const port = 9000;
const app = express();
const httpServer = http.createServer(app);

let weatherCache;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

db.connect()
  .then(client => {
    try {
      const rawdata = fs.readFileSync('./src/conditions.json');
      const weatherConditions = JSON.parse(rawdata.toString());
      const weatherService = new WeatherForecastService(weatherConditions);
      weatherCache = new WeatherForecastCache(
        db.collections.cache,
        db.collections.location,
        db.collections.historical,
        weatherService
      );
    } catch (e) {
      console.error(e);
      return process.exit(1);
    }

    httpServer.listen(port, () => {
      return console.log(`Listening at http://localhost:${port}`);
    });
  })
  .catch(error => console.error(error));

/**
 * Obtiene el pronóstico actual.
 */
app.get('/api/weather/current', (req, res) => {
  const { latitude, longitude } = req.query;
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    latitude: latitude,
    longitude: longitude
  });

  if (error) {
    let message = '';
    error.details.forEach(detail => message += detail.message);
    return res.status(400).json({ error: message });
  }

  weatherCache.current(weatherQuery)
    .then(weather => res.status(200).json(weather))
    .catch(error => res.status(500).json(error));
});

/**
 * Obtiene el pronóstico diario de los 7 días siguientes a partir de hoy.
 */
 app.get('/api/weather/daily', (req, res) => {
  const { latitude, longitude } = req.query;
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    latitude: latitude,
    longitude: longitude
  });

  if (error) {
    let message = '';
    error.details.forEach(detail => message += detail.message);
    return res.status(400).json({ error: message });
  }

  weatherCache.daily(weatherQuery)
    .then(weather => res.status(200).json(weather))
    .catch(error => res.status(500).json(error));
});

/**
 * Obtiene el pronóstico por hora, para una fecha mayor o igual al día de hoy, y
 * hasta 7 días incluyendo el día de hoy.
 */
app.get('/api/weather/hourly/:year/:month/:day', (req, res) => {
  const { year, month, day } = req.params;
  const { latitude, longitude } = req.query;
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    latitude: latitude,
    longitude: longitude,
    date: new Date(parseInt(year), parseInt(month)-1, parseInt(day))
  });

  if (error) {
    let message = '';
    error.details.forEach(detail => message += detail.message);
    return res.status(400).json({ error: message });
  }

  weatherCache.hourly(weatherQuery)
    .then(weather => res.status(200).json(weather))
    .catch(error => res.status(500).json(error));
});

app.get('/api/weather/historical', (req, res) => {
  const { latitude, longitude, date, days, withLocation } = req.query;
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    latitude: latitude,
    longitude: longitude,
    date: new Date(date),
    days: days || -7,
    withLocation: withLocation || false
  });

  if (error) {
    let message = '';
    error.details.forEach(detail => message += detail.message);
    return res.status(400).json({ error: message });
  }

  weatherCache.history(weatherQuery)
    .then(weather => res.status(200).json(weather))
    .catch(error => res.status(500).json(error));
});
