// Background service worker v6 - Download + Network Monitoring
// Handles sidepanel, downloads, and API request capture

const SERVER_URL = 'http://localhost:3333'

// Track pending downloads
const pendingDownloads = new Map()

// Captured API requests (for analysis)
const capturedRequests = []

// Open sidepanel on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Side panel setup error:', error))

// ===== NETWORK REQUEST CAPTURE =====

// Capture request details including body
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Only capture POST/PUT requests to grok.com API
    if (!details.url.includes('/api/') && !details.url.includes('imagine')) return

    const requestData = {
      timestamp: Date.now(),
      method: details.method,
      url: details.url,
      type: details.type,
      tabId: details.tabId
    }

    // Capture request body if present
    if (details.requestBody) {
      if (details.requestBody.raw) {
        // Binary data - decode to string
        const decoder = new TextDecoder()
        const body = details.requestBody.raw.map(part => {
          if (part.bytes) return decoder.decode(part.bytes)
          return ''
        }).join('')
        requestData.body = body.substring(0, 5000) // Limit size
      } else if (details.requestBody.formData) {
        requestData.formData = details.requestBody.formData
      }
    }

    capturedRequests.push(requestData)
    console.log('[GrokBridge] Captured request:', details.method, details.url)

    // Keep only last 50 requests
    if (capturedRequests.length > 50) capturedRequests.shift()

    // Send to server
    fetch(`${SERVER_URL}/network/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    }).catch(() => { })
  },
  { urls: ['*://grok.com/*', '*://*.grok.com/*'] },
  ['requestBody']
)

// Capture response headers
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (!details.url.includes('/api/') && !details.url.includes('imagine')) return

    const responseData = {
      timestamp: Date.now(),
      url: details.url,
      statusCode: details.statusCode,
      headers: {}
    }

    // Extract relevant headers
    for (const header of details.responseHeaders || []) {
      const name = header.name.toLowerCase()
      if (['content-type', 'content-length', 'x-request-id', 'cf-ray'].includes(name)) {
        responseData.headers[name] = header.value
      }
    }

    // Send to server
    fetch(`${SERVER_URL}/network/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responseData)
    }).catch(() => { })
  },
  { urls: ['*://grok.com/*', '*://*.grok.com/*'] },
  ['responseHeaders']
)

// ===== DOWNLOAD MONITORING =====

// Monitor download completion
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state?.current === 'complete') {
    // Get download info
    chrome.downloads.search({ id: delta.id }, (results) => {
      if (results && results.length > 0) {
        const download = results[0]
        console.log('[GrokBridge] Download complete:', download.filename)

        // Notify server about completed download
        fetch(`${SERVER_URL}/downloads/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: delta.id,
            filename: download.filename,
            fileSize: download.fileSize,
            mime: download.mime,
            url: download.url?.substring(0, 100)
          })
        }).catch(err => console.error('Failed to notify server:', err))
      }
    })
  }
})

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Forward log events from content to sidepanel
  if (request.action === 'logEvent') {
    chrome.runtime.sendMessage(request).catch(() => { })
  }

  // Get captured requests
  if (request.action === 'getCapturedRequests') {
    sendResponse({ requests: capturedRequests })
    return
  }

  // Download file silently
  if (request.action === 'downloadFile') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message })
      } else {
        pendingDownloads.set(downloadId, { started: Date.now() })
        sendResponse({ success: true, downloadId })
      }
    })
    return true
  }
  // Export all cookies for grok.com
  if (request.action === 'exportCookies') {
    // Get cookies from the actual URL to capture all including cf_clearance
    chrome.cookies.getAll({ url: 'https://grok.com' }, async (urlCookies) => {
      // Also try domain variations
      const domainCookies = await chrome.cookies.getAll({ domain: 'grok.com' })
      const dotCookies = await chrome.cookies.getAll({ domain: '.grok.com' })

      const allCookies = [...urlCookies, ...domainCookies, ...dotCookies]

      // Remove duplicates
      const seen = new Set()
      const unique = allCookies.filter(c => {
        const key = `${c.name}:${c.domain}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Log cookie names for debugging
      console.log(`[GrokBridge] Exporting ${unique.length} cookies:`, unique.map(c => c.name).join(', '))

      // Send to server
      fetch(`${SERVER_URL}/cookies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unique)
      }).then(() => {
        sendResponse({ success: true, count: unique.length, names: unique.map(c => c.name) })
      }).catch(err => {
        sendResponse({ success: false, error: err.message })
      })
    })
    return true
  }
})

console.log('Grok Bridge v6 background loaded - Network capture enabled')

