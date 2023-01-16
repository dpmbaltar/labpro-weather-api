import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import * as db from './connection';
import {
  WeatherForecastCache,
  WeatherForecastService,
  WeatherQuerySchema
} from './weather-forecast';

let weatherCache;
const port = 9000;
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

db.connect()
  .then(client => {
    const cacheCollection = db.cache();
    const weatherService = new WeatherForecastService();
    weatherCache = new WeatherForecastCache(cacheCollection, weatherService);

    app.listen(port, () => {
      return console.log(`Listening at http://localhost:${port}`);
    })
  })
  .catch(error => console.error(error));

/**
 * Obtiene las posibles condiciones del tiempo:
 * - código
 * - texto de día
 * - texto de noche
 * - ícono
 */
app.get('/api/weather/conditions', (req, res) => {
  try {
    const rawdata = fs.readFileSync('./src/conditions.json');
    const conditions = JSON.parse(rawdata.toString());
    res.status(200).json(conditions);
  } catch (e) {
    console.error(e);
    return res.status(500).json();
  }
});

/**
 * Obtiene el pronóstico por fecha mayor o igual al día de hoy.
 */
app.get('/api/weather/:year/:month/:day', async (req, res) => {
  const { year, month, day } = req.params;
  const { latitude, longitude } = req.query;
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    latitude: latitude,
    longitude: longitude,
    date: new Date(parseInt(year), parseInt(month)-1, parseInt(day))
  });

  if (error)
    return res.status(400).json({ error: error });

  weatherCache.hourly(weatherQuery)
    .then(weather => res.status(200).json(weather))
    .catch(error => res.status(404).json(error));
});

/**
 * Obtiene el pronóstico actual.
 */
app.get('/api/weather/current', async (req, res) => {
  const { latitude, longitude } = req.query;
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    latitude: latitude,
    longitude: longitude
  });

  if (error)
    return res.status(400).json({ error: error });

  weatherCache.current(weatherQuery)
    .then(weather => res.status(200).json(weather))
    .catch(error => res.status(404).json(error));
});

/**
 * Obtiene el pronóstico de los días siguientes.
 */
 app.get('/api/weather/forecast', async (req, res) => {
  const { latitude, longitude } = req.query;
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    latitude: latitude,
    longitude: longitude
  });

  if (error)
    return res.status(400).json({ error: error });

  weatherCache.daily(weatherQuery)
    .then(weather => res.status(200).json(weather))
    .catch(error => res.status(404).json(error));
});
