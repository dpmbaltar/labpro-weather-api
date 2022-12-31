import express from 'express'
import bodyParser from 'body-parser'
import path from 'path'
import axios from 'axios'
import joi from 'joi';
import { connection } from './connection'
import { WeatherCache, WeatherService, WeatherQuerySchema } from './weather'

const port = 9000
const staticDir = path.dirname(__dirname) + '/app'
const app = express()

app.use(express.static(staticDir))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

/**
 * Obtener pronóstico por fecha mayor o igual a hoy.
 * @todo
 */
app.get('/api/weather/:year/:month/:day', async (req, res) => {
  const { params, query } = req
  const { year = 1900, month = 1, day = 1 } = params
  const { lat = 0, lon = 0 } = query
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

  res.status(200).json(weather);
})

/**
 * Obtener pronóstico actual.
 */
app.get('/api/weather/current', async (req, res) => {
  const { params, query } = req
  const { lat = 0, lon = 0 } = query
  const { error, value:weatherQuery } = WeatherQuerySchema.validate({
    latitude: lat,
    longitude: lon,
  })

  if (error)
    return res.status(400).json({ error: error })

  const cacheCollection = await connection.getCache()
  const weatherCache = new WeatherCache(cacheCollection, new WeatherService())
  const currentWeather = await weatherCache.current(weatherQuery)

  res.status(200).json(currentWeather);
})

/**
 * Obtener pronóstico de los siguientes días.
 * @todo
 */
 app.get('/api/weather/forecast', async (req, res) => {
  res.status(404).send()
})

/*app.get('/api/weather/:year/:month/:day', (req, res) => {
  const { params } = req // const params = req.params
  const { year = 1900, month = 1, day = 1 } = params
  const { error, value:weatherDate } = joi.date().iso().validate(`${year}-${month}-${day}`)

  if (error)
    return res.status(400).json({error: error})

  try {
    // Leer datos del archivo
    let rawdata = fs.readFileSync(dbFile)
    let db = JSON.parse(rawdata)

    // Buscar fecha
    let found = db.forecast.find(weather => {
      const d1 = Date.parse(weather.date)
      const d2 = weatherDate
      return d1.valueOf() === d2.valueOf()
    })

    // Devolver el elemento si fue encontrado
    if (found)
      res.status(200).json(found)
    else
      res.status(404).send()

  } catch (e) {
    console.log(`Error al leer archivo db.json: ${e}`)
    return res.status(500).json()
  }
})

app.get('/api/weather/forecast', (req, res) => {
  const { query:queryParams } = req // const queryParams = req.query
  const { error, value } = valid.weatherParamsSchema.validate(queryParams)

  if (error)
    return res.status(400).json({error: error})

  try {
    // Leer datos del archivo
    let rawdata = fs.readFileSync(dbFile)
    let db = JSON.parse(rawdata)

    // Establecer params por defecto
    let { from = 0, days = 1 } = value
    let date = new Date(new Date().getTime()) //+ (from*24*60*60*1000));

    // Buscar días a partir de hoy
    let found = db.forecast.find(weather => {
      const d1 = parseInt(new String(Date.parse(weather.date).valueOf()/1000/60/60/24).toString())
      const d2 = parseInt(new String(date.valueOf()/1000/60/60/24).toString())
      return d1 == d2
    })

    // Buscar "days" cantidad de días desde el día de hoy + "from" días
    let start = db.forecast.indexOf(found)
    let forecast = db.forecast.slice(from + start, from + start + days)
    let total = db.forecast.length - start // Cantidad de días a paginar

    res.status(200).json({
      total: total,
      forecast: forecast
    })
  } catch (e) {
    console.log(`Error inesperado: ${e}`)
    return res.status(500).json()
  }
})*/

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
