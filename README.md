# labpro-weather-api

## Herramientas

- [VSCode](https://code.visualstudio.com/)
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [RapidAPI](https://www.rapidapi.com/)

## Empezar

1. Abrir la consola o terminal (en Windows, click derecho en una carpeta -> Git Bash Here)
2. Clonar el repositorio con `git clone https://github.com/dpmbaltar/labpro-weather-api.git`
3. Cambiar a la carpeta del repositorio con `cd labpro-weather-api`
4. Dentro del directorio `labpro-weather-api`:
    1. Renombrar el archivo `src/config.ts.sample` a `src/config.ts` y:
        1. Modificar la propiedad `dbConfig.uri` para conectarse a MongoDB
        2. Obtener una clave en RapidAPI para WeatherAPI y colocarla en la propiedad `weatherapi.key`
    2. Dentro del directorio `labpro-weather-api`:
        1. Instalar dependencias con `npm install`
        2. Iniciar servidor con `npm start` (http://localhost:9000/)

## Endpoints

### Clima actual: `/api/weather/current`

Parámetros:

- `latitude` - la latitud de la ubicación
- `longitude` - la longitud de la ubicación

Ejemplo: `/api/weather/current?latitude=-38.95&longitude=-68.07`

### Pronóstico semanal por día: `/api/weather/daily`

Parámetros:

- `latitude` - la latitud de la ubicación
- `longitude` - la longitud de la ubicación

Ejemplo: `/api/weather/daily?latitude=-38.95&longitude=-68.07`

### Pronóstico por hora para una fecha: `/api/weather/hourly/:year/:month/:day`

Parámetros:

- `:year` - el año completo
- `:month` - el mes completo (de 01 a 12)
- `:day` - el año completo (de 01 a 31, según el mes)
- `latitude` - la latitud de la ubicación
- `longitude` - la longitud de la ubicación

Ejemplo: `/api/weather/hourly/2023/02/28?latitude=-38.95&longitude=-68.06`

### Clima histórico: `/api/weather/historical`

- `latitude` - la latitud de la ubicación
- `longitude` - la longitud de la ubicación
- `date` - una fecha válida
- `days` - cantidad de días a solicitar (desde -7 hasta 7, a partir de `date`)

Ejemplo: `/api/weather/historical?latitude=-38.95&longitude=-68.07&date=2023-02-03&days=-7`

Powered by:

- [WeatherAPI](https://www.weatherapi.com/)
- [Open-Meteo](https://open-meteo.com/)
