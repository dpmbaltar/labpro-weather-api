
const _cache = {}
const _cache_ttl = 60*60*1000
const _geolocation = { position: null }

function getCache(key) {
  if (!_cache[key])
    return null

  const { timestamp, value } = _cache[key]
  const elapsedTime = (new Date().getTime() - timestamp)

  if (elapsedTime > _cache_ttl) {
    delete _cache[key]
    return null
  }

  return value
}

function setCache(key, value) {
  const date = new Date()
  _cache[key] = { timestamp: date.getTime(), value: value }
}

function getGeolocation(showPosition) {
  if (_geolocation.position)
    return showPosition(_geolocation.position)

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      _geolocation.position = position
      showPosition(position)
    })
  } else {
    alert("Geolocation is not supported by this browser.")
  }
}

function activateSection(sectionId) {
  const main = document.getElementById('main')
  const section = document.getElementById(sectionId)

  main.querySelectorAll('section')
    .forEach(element => element.classList.add('collapse'))
  section.classList.remove('collapse')
}

function togglePlaceholder(elementId, placeholderId, showPlaceholder = true) {
  const element = document.getElementById(elementId)
  const placeholder = document.getElementById(placeholderId)

  if (showPlaceholder) {
    element.classList.add('collapse')
    placeholder.classList.remove('collapse')
  } else {
    placeholder.classList.add('collapse')
    element.classList.remove('collapse')
  }
}
