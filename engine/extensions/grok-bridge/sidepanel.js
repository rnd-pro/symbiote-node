// Sidepanel v4 - Event log display

const SERVER_URL = 'http://localhost:3333'
const eventsDiv = document.getElementById('events')
const statusDot = document.getElementById('statusDot')
const statusText = document.getElementById('statusText')

let events = []

/**
 * Check server and page connection
 */
async function checkStatus() {
  try {
    const res = await fetch(`${SERVER_URL}/health`)
    const data = await res.json()
    statusDot.className = 'status-dot connected'
    statusText.textContent = `Bridge connected (${data.pendingCommands || 0} pending)`
  } catch {
    statusDot.className = 'status-dot disconnected'
    statusText.textContent = 'Bridge disconnected'
  }
}

/**
 * Add event to display
 */
function addEvent(event) {
  events.unshift(event)
  if (events.length > 50) events.pop()
  renderEvents()
}

/**
 * Render events list
 */
function renderEvents() {
  if (events.length === 0) {
    eventsDiv.innerHTML = '<div class="empty">Waiting for events...</div>'
    return
  }

  eventsDiv.innerHTML = events.map(e => {
    const time = new Date(e.time).toLocaleTimeString()
    return `
      <div class="event">
        <span class="event-time">${time}</span>
        <span class="event-type ${e.type}">${e.type}</span>
        <span class="event-data">${e.data}</span>
      </div>
    `
  }).join('')
}

// Listen for events from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'logEvent') {
    addEvent(request.event)
  }
  return true
})

// Fetch existing events from content script
async function fetchExistingEvents() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'getEventLog' }, (response) => {
        if (response?.events) {
          events = response.events
          renderEvents()
        }
      })
    }
  } catch { }
}

// Initialize
checkStatus()
fetchExistingEvents()
setInterval(checkStatus, 3000)

// Export Cookies button handler
const exportBtn = document.getElementById('exportCookies')
const cookieStatus = document.getElementById('cookieStatus')

exportBtn.addEventListener('click', async () => {
  exportBtn.disabled = true
  exportBtn.textContent = '⏳ Exporting...'
  cookieStatus.textContent = ''

  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'exportCookies' }, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(res)
        }
      })
    })

    if (response?.success) {
      cookieStatus.style.color = '#00d4aa'
      cookieStatus.textContent = `✅ Exported ${response.count} cookies`
      addEvent({ time: new Date().toISOString(), type: 'result', data: `Exported ${response.count} cookies` })
    } else {
      throw new Error(response?.error || 'Unknown error')
    }
  } catch (err) {
    cookieStatus.style.color = '#ff4757'
    cookieStatus.textContent = `❌ ${err.message}`
    addEvent({ time: new Date().toISOString(), type: 'error', data: err.message })
  } finally {
    exportBtn.disabled = false
    exportBtn.textContent = '🍪 Export Cookies'
  }
})

// Generate Image button handler
const generateBtn = document.getElementById('generateBtn')
const promptInput = document.getElementById('promptInput')
const aspectRatio = document.getElementById('aspectRatio')
const generateStatus = document.getElementById('generateStatus')
const resultContainer = document.getElementById('resultContainer')
const resultImage = document.getElementById('resultImage')
const resultLink = document.getElementById('resultLink')

generateBtn.addEventListener('click', async () => {
  const prompt = promptInput.value.trim()
  if (!prompt) {
    generateStatus.style.color = '#ff4757'
    generateStatus.textContent = 'Please enter a prompt'
    return
  }

  generateBtn.disabled = true
  generateBtn.textContent = '⏳ Generating...'
  generateStatus.style.color = '#666'
  generateStatus.textContent = 'Sending to browser...'
  resultContainer.style.display = 'none'

  try {
    // Send command to server
    const res = await fetch(`${SERVER_URL}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generateImage',
        params: {
          prompt,
          options: { aspectRatio: aspectRatio.value }
        }
      })
    })

    if (!res.ok) throw new Error('Failed to send command')
    const { id } = await res.json()

    generateStatus.textContent = `Command sent (${id}), waiting...`
    addEvent({ time: new Date().toISOString(), type: 'command', data: `Generate: ${prompt}` })

    // Poll for result
    const startTime = Date.now()
    const timeout = 70000

    while (Date.now() - startTime < timeout) {
      await new Promise(r => setTimeout(r, 1000))

      const resultRes = await fetch(`${SERVER_URL}/result/${id}`)
      if (!resultRes.ok) continue

      const data = await resultRes.json()

      if (data.result) {
        // Success!
        generateStatus.style.color = '#00d4aa'
        generateStatus.textContent = `✅ Generated!`

        resultImage.src = data.result.imageUrl
        resultLink.href = data.result.imageUrl
        resultContainer.style.display = 'block'

        addEvent({
          time: new Date().toISOString(),
          type: 'result',
          data: `Image: ${data.result.jobId}`
        })
        return
      }

      if (data.error) {
        throw new Error(data.error)
      }

      generateStatus.textContent = `Generating... (${Math.round((Date.now() - startTime) / 1000)}s)`
    }

    throw new Error('Timeout waiting for result')

  } catch (err) {
    generateStatus.style.color = '#ff4757'
    generateStatus.textContent = `❌ ${err.message}`
    addEvent({ time: new Date().toISOString(), type: 'error', data: err.message })
  } finally {
    generateBtn.disabled = false
    generateBtn.textContent = '🚀 Generate'
  }
})

// Allow Enter key to generate
promptInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !generateBtn.disabled) {
    generateBtn.click()
  }
})

// Show Zones button handler
const showZonesBtn = document.getElementById('showZonesBtn')
let zonesVisible = false

showZonesBtn.addEventListener('click', async () => {
  showZonesBtn.disabled = true

  try {
    if (zonesVisible) {
      // Hide zones
      const res = await fetch(`${SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hideZones', params: {} })
      })
      if (res.ok) {
        showZonesBtn.textContent = '🎯 Show Zones'
        showZonesBtn.style.background = '#ff6b6b'
        zonesVisible = false
        addEvent({ time: new Date().toISOString(), type: 'info', data: 'Zones hidden' })
      }
    } else {
      // Show zones
      const res = await fetch(`${SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'showClickableZones', params: {} })
      })
      if (res.ok) {
        const { id } = await res.json()

        // Wait for result
        await new Promise(r => setTimeout(r, 1000))
        const resultRes = await fetch(`${SERVER_URL}/result/${id}`)
        const data = await resultRes.json()

        if (data.result?.zones) {
          showZonesBtn.textContent = '🚫 Hide Zones'
          showZonesBtn.style.background = '#666'
          zonesVisible = true
          addEvent({
            time: new Date().toISOString(),
            type: 'result',
            data: `Showing ${data.result.total} zones`
          })

          // Show layer buttons
          document.getElementById('layerButtons').style.display = 'flex'
        }
      }
    }
  } catch (err) {
    addEvent({ time: new Date().toISOString(), type: 'error', data: err.message })
  } finally {
    showZonesBtn.disabled = false
  }
})

// Layer toggle buttons handler
document.querySelectorAll('.layer-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const layer = btn.dataset.layer
    try {
      const res = await fetch(`${SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'showClickableZones', params: { layer } })
      })
      if (res.ok) {
        const { id } = await res.json()
        await new Promise(r => setTimeout(r, 1000))
        const resultRes = await fetch(`${SERVER_URL}/result/${id}`)
        const data = await resultRes.json()
        if (data.result?.zones) {
          addEvent({
            time: new Date().toISOString(),
            type: 'result',
            data: `Showing ${data.result.total} ${layer} zones`
          })
        }
      }
    } catch (err) {
      addEvent({ time: new Date().toISOString(), type: 'error', data: err.message })
    }
  })
})
