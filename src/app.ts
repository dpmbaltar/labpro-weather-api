import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import { connection } from './connection';
import {
  WeatherForecastCache,
  WeatherForecastService,
  WeatherQuerySchema
} from './weather-forecast';

const port = 9000;
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

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
 * @todo
 */
app.get('/api/weather/:year/:month/:day', async (req, res) => {
  const { year, month, day } = req.params;
  const { latitude, longitude } = req.query;
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    latitude: latitude,
    longitude: longitude,
    date: new Date(year, month, day)
  });

  if (error)
    return res.status(400).json({ error: error });

  const cacheColl = await connection.getCache();
  const weatherService = new WeatherForecastService();
  const weatherCache = new WeatherForecastCache(cacheColl, weatherService);

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

  const cacheColl = await connection.getCache();
  const weatherService = new WeatherForecastService();
  const weatherCache = new WeatherForecastCache(cacheColl, weatherService);

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

  const cacheColl = await connection.getCache();
  const weatherService = new WeatherForecastService();
  const weatherCache = new WeatherForecastCache(cacheColl, weatherService);

  weatherCache.daily(weatherQuery)
    .then(weather => res.status(200).json(weather))
    .catch(error => res.status(404).json(error));
});

/**
 * Crear pronóstico
 */
/*app.post('/api/weather', (req, res) => {
  const { body:newWeather } = req
  const { error, value:newValidWeather } = valid.weatherSchema.validate(newWeather)

  if (error)
    return res.status(400).json({ error: error })

  try {
    // Leer archivo dbschema.js
    let rawdata = fs.readFileSync(dbFile)
    let db = JSON.parse(rawdata)
    let found = db.forecast.find(element => {
      const d1 = Date.parse(element.date)
      const d2 = Date.parse(newValidWeather.date)
      return d1.valueOf() === d2.valueOf()
    })

    // Verificar si el elemento existe
    if (found)
      return res.status(400).json({error: 'El elemento ya existe'})

    // Modificar arreglo de datos
    db.forecast.push(newValidWeather)

    // convert JSON object to a string
    const data = JSON.stringify(db, null, 2);

    // Guardar archivo modificado
    fs.writeFileSync(dbFile, data, 'utf8');

    res.status(200).json(newValidWeather)

  } catch (e) {
    console.log(`Error al leer archivo db.json: ${e}`)
    return res.status(500).json()
  }
})*/

app.listen(port, () => {
  return console.log(`Listening at http://localhost:${port}`)
})
