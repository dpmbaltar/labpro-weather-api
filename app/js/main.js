

const app = new Navigo('http://localhost:9000/', true, '#!');

app.on('/weather/current', () => {
  togglePlaceholder('current-weather', 'current-placeholder')
  activateSection('current-section')
  getGeolocation((position) => {
    const lat = position.coords.latitude
    const lon = position.coords.longitude

    fetch(`/api/weather/current?lat=${lat}&lon=${lon}`)
      .then(response => response.json())
      .then(response => {
        console.log(response)
        const weather = response
        const location = response.location
        const current = response.current
        const section = document.getElementById('current-section')
        const entries = {
          last_updated: () => {
            const date = new Date(current.last_updated)
            const options = {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric'
            }
            return date.toLocaleString('es-AR', options)
          },
          location: () => `${location.name}, ${location.region}, ${location.country}`,
          temp_c: () => current.temp_c + ' &deg;C',
          temp_f: () => current.temp_f + ' &deg;F',
          condition_text: () => current.condition.text,
          condition_icon: (e) => {
            let icon = 'images/64x64/'
            icon += current.is_day ? 'day/' : 'night/'
            icon += current.condition.icon.split('/').pop()
            e.src = icon
            e.alt = current.condition.text
            return null
          },
          wind_kph: () => current.wind_kph + ' km/h',
          wind_mph: () => current.wind_mph + ' mph',
          wind_dir: () => current.wind_dir,
          wind_dir_icon: (e) => {
            const icon = document.createElement('i')
            icon.classList.add('bi')
            icon.classList.add('bi-arrow-down')
            return icon.outerHTML
          },
          pressure_mb: () => current.pressure_mb + ' hPa',
          pressure_in: () => current.pressure_in + ' inHg',
          precip_mm: () => current.precip_mm + ' mm',
          precip_in: () => current.precip_in + ' in',
          humidity: () => current.humidity + '%',
          cloud: () => current.cloud + '%',
          feelslike_c: () => current.feelslike_c + ' &deg;C',
          feelslike_f: () => current.feelslike_f + ' &deg;F',
          vis_km: () => current.vis_km + ' km',
          vis_miles: () => current.vis_miles + '  miles',
          uv: () => current.uv,
        }

        Object.keys(entries).forEach((key) => {
          const element = section.querySelector(`[data-name="${key}"]`)
          const callback = entries[key]
          const value = callback(element)
          if (value)
            element.innerHTML = value
        })

        togglePlaceholder('current-weather', 'current-placeholder', false)
      }).catch(error => {
        console.log(error)
      })
  })
})

app.on('/weather/forecast', () => {

})

app.on('*', () => {
  router.navigate('/weather/current')
})

app.resolve()
