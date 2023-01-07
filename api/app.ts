import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { connection } from './connection'
import { WeatherCache, WeatherService, WeatherQuerySchema } from './weather'

const port = 9000
const staticDir = path.dirname(__dirname) + '/app'
const app = express()

app.use(express.static(staticDir))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(cors())

/**
 * Obtiene las posibles condiciones del tiempo:
 * - código
 * - texto de día
 * - texto de noche
 * - ícono
 */
app.get('/api/weather/conditions', (req, res) => {
  try {
    const rawdata = fs.readFileSync('./api/conditions.json')
    const conditions = JSON.parse(rawdata.toString())
    res.status(200).json(conditions)
  } catch (e) {
    console.error(e)
    return res.status(500).json()
  }
})

/**
 * Obtiene el pronóstico por fecha mayor o igual al día de hoy.
 * @todo
 */
app.get('/api/weather/:year/:month/:day', async (req, res) => {
  const { year = 1900, month = 1, day = 1 } = req.params
  const { lat = 0, lon = 0 } = req.query
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    date: new Date(year, month, day),
    latitude: lat,
    longitude: lon,
  })

  if (error)
    return res.status(400).json({ error: error })

  const cacheCollection = await connection.getCache()
  const weatherCache = new WeatherCache(cacheCollection, new WeatherService())
  const weather = await weatherCache.current(weatherQuery)

  if (weather.error)
    return res.status(400).json(weather)
  else if (weather)
    return res.status(200).json(weather)
  else
    return res.status(404)
})

/**
 * Obtiene el pronóstico actual.
 */
app.get('/api/weather/current', async (req, res) => {
  const { lat = 0, lon = 0 } = req.query
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    latitude: lat,
    longitude: lon,
  })

  if (error)
    return res.status(400).json({ error: error })

  const cacheCollection = await connection.getCache()
  const weatherCache = new WeatherCache(cacheCollection, new WeatherService())
  const weather = await weatherCache.current(weatherQuery)

  if (weather.error)
    return res.status(400).json(weather)
  else if (weather)
    //return res.set("Access-Control-Allow-Origin", "*").status(200).json(weather)
    return res.status(200).json(weather)
  else
    return res.status(404)
})

/**
 * Obtiene el pronóstico de los días siguientes.
 * @todo
 */
 app.get('/api/weather/forecast', async (req, res) => {
  const { lat = 0, lon = 0 } = req.query
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    latitude: lat,
    longitude: lon,
  })

  if (error)
    return res.status(400).json({ error: error })

  const cacheCollection = await connection.getCache()
  const weatherCache = new WeatherCache(cacheCollection, new WeatherService())
  const weather = await weatherCache.forecast(weatherQuery)

  if (weather.error)
    return res.status(400).json(weather)
  else if (weather)
    return res.status(200).json(weather)
  else
    return res.status(404)
})

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
