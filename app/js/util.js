
let _geolocation = null

function getGeolocation(showPosition) {
  if (_geolocation)
    return showPosition(_geolocation)

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      _geolocation = position
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
