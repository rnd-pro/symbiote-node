const VERSION = '6.1.1'

const SERVER_URL = 'http://localhost:3333'
const POLL_INTERVAL = 1000

// Persist worker ID across reloads
let workerId = sessionStorage.getItem('GROK_WORKER_ID')
if (!workerId) {
  workerId = `worker_${Math.random().toString(36).substring(2, 9)}`
  sessionStorage.setItem('GROK_WORKER_ID', workerId)
}
const WORKER_ID = workerId

console.log(`[GrokBridge] v${VERSION} loaded (Worker: ${WORKER_ID})`)

// Event log for sidepanel (stores last N events)
let eventLog = []
const MAX_LOG_ENTRIES = 50

/**
 * Log event and notify sidepanel
 * @param {string} type - Event type: 'command', 'result', 'error'
 * @param {any} data - Event data
 */
function logEvent(type, data) {
  let entry = {
    time: new Date().toISOString(),
    type,
    data: typeof data === 'string' ? data : JSON.stringify(data).substring(0, 200)
  }
  eventLog.unshift(entry)
  if (eventLog.length > MAX_LOG_ENTRIES) eventLog.pop()

  // Broadcast to sidepanel
  chrome.runtime.sendMessage({ action: 'logEvent', event: entry }).catch(() => { })
}

/**
 * Perform coordinate-based click on element using PointerEvents + MouseEvents
 * This is the ONLY way to reliably click Radix UI and similar frameworks
 * @param {Element} el - Element to click
 * @returns {{x: number, y: number}} - Click coordinates
 */
function performCoordinateClick(el) {
  // Get element center coordinates
  let rect = el.getBoundingClientRect()
  let centerX = rect.left + rect.width / 2
  let centerY = rect.top + rect.height / 2

  // Focus first
  el.focus()

  // Create events with coordinates
  let eventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
    screenX: window.screenX + centerX,
    screenY: window.screenY + centerY,
    button: 0,
    buttons: 1
  }

  // Dispatch pointer and mouse events for maximum compatibility
  el.dispatchEvent(new PointerEvent('pointerdown', { ...eventInit, pointerType: 'mouse' }))
  el.dispatchEvent(new MouseEvent('mousedown', eventInit))
  el.dispatchEvent(new PointerEvent('pointerup', { ...eventInit, pointerType: 'mouse' }))
  el.dispatchEvent(new MouseEvent('mouseup', eventInit))
  el.dispatchEvent(new PointerEvent('click', { ...eventInit, pointerType: 'mouse' }))
  el.dispatchEvent(new MouseEvent('click', eventInit))

  return { x: centerX, y: centerY }
}

/**
 * Poll server for commands and execute them
 */
async function pollForCommands() {
  try {
    let res = await fetch(`${SERVER_URL}/commands/pending?workerId=${WORKER_ID}`)
    if (!res.ok) return

    let { commands } = await res.json()

    for (const cmd of commands) {
      console.log(`[GrokBridge] Executing: ${cmd.action} (${cmd.id})`)
      logEvent('command', { id: cmd.id, action: cmd.action })

      try {
        let result

        let action = (cmd.action || "").trim()
        console.log(`[GrokBridge] Executing trimmed action: "${action}" (len: ${action.length}) v${VERSION}`)

        switch (action) {
          // === Direct DOM Commands (no eval needed) ===

          case 'click':
            // Click element by selector using coordinate-based click
            let clickEl = document.querySelector(cmd.params.selector)
            if (!clickEl) throw new Error(`Element not found: ${cmd.params.selector}`)
            let coords = performCoordinateClick(clickEl)
            result = { clicked: true, selector: cmd.params.selector, ...coords }
            break

          case 'clickByText':
            // Click element containing text (more robust search)
            let searchText = cmd.params.text.toLowerCase().trim()
            // Search almost everything that could be a button or menu item
            let candidates = document.querySelectorAll('button, [role="button"], [role="menuitem"], span, a, div, li')
            let foundEl = null

            for (const el of candidates) {
              let elText = el.textContent?.toLowerCase().trim() || ''
              if (elText.includes(searchText)) {
                // If it's a small element (like span or div inside a button), 
                // we might want the parent if the parent is a button
                let target = el
                // Simple heuristic: if we hit a span/div inside a button-like thing, use the button-like thing
                let parentButton = el.closest('button, [role="button"], [role="menuitem"]')
                if (parentButton) target = parentButton

                foundEl = target
                break
              }
            }

            if (foundEl) {
              let textCoords = performCoordinateClick(foundEl)
              result = { clicked: true, text: cmd.params.text, tag: foundEl.tagName, ...textCoords }
            } else {
              throw new Error(`Element with text not found: ${cmd.params.text}`)
            }
            break

          case 'clickAtCoords':
            // Click at arbitrary screen coordinates
            let x = cmd.params.x
            let y = cmd.params.y

            // Find element at coordinates
            let targetEl = document.elementFromPoint(x, y)

            let coordEventInit = {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: x,
              clientY: y,
              screenX: window.screenX + x,
              screenY: window.screenY + y,
              button: 0,
              buttons: 1
            }

            // Dispatch to document if no element found
            let dispatchTarget = targetEl || document.body
            dispatchTarget.dispatchEvent(new PointerEvent('pointerdown', { ...coordEventInit, pointerType: 'mouse' }))
            dispatchTarget.dispatchEvent(new MouseEvent('mousedown', coordEventInit))
            dispatchTarget.dispatchEvent(new PointerEvent('pointerup', { ...coordEventInit, pointerType: 'mouse' }))
            dispatchTarget.dispatchEvent(new MouseEvent('mouseup', coordEventInit))
            dispatchTarget.dispatchEvent(new PointerEvent('click', { ...coordEventInit, pointerType: 'mouse' }))
            dispatchTarget.dispatchEvent(new MouseEvent('click', coordEventInit))

            result = { clicked: true, x, y, tag: targetEl?.tagName || 'BODY' }
            break

          case 'clickNear':
            // Click near an anchor element with offset
            // Useful when button is next to known element (like submit button next to textarea)
            let anchorEl = document.querySelector(cmd.params.anchor)
            if (!anchorEl) throw new Error(`Anchor not found: ${cmd.params.anchor}`)

            let anchorRect = anchorEl.getBoundingClientRect()
            let offsetX = cmd.params.offsetX || 0
            let offsetY = cmd.params.offsetY || 0

            // Calculate target point (default: right edge center + offset)
            let nearX = anchorRect.right + offsetX
            let nearY = anchorRect.top + anchorRect.height / 2 + offsetY

            let nearTarget = document.elementFromPoint(nearX, nearY)
            if (nearTarget) {
              let nearCoords = performCoordinateClick(nearTarget)
              result = { clicked: true, anchor: cmd.params.anchor, targetTag: nearTarget.tagName, ...nearCoords }
            } else {
              throw new Error(`No element at offset from anchor`)
            }
            break

          case 'clickSibling':
            // Click a sibling/nearby button relative to an anchor element
            // Finds anchor, goes up to container, finds button in same container
            let sibAnchor = document.querySelector(cmd.params.anchor)
            if (!sibAnchor) throw new Error(`Anchor not found: ${cmd.params.anchor}`)

            // Try multiple container levels
            let sibBtn = null
            let container = sibAnchor.parentElement
            for (let i = 0; i < 5 && !sibBtn && container; i++) {
              sibBtn = container.querySelector(cmd.params.buttonSelector || 'button:not([aria-label])')
              if (!sibBtn) container = container.parentElement
            }

            if (sibBtn) {
              let sibCoords = performCoordinateClick(sibBtn)
              result = { clicked: true, anchor: cmd.params.anchor, buttonTag: sibBtn.tagName, ...sibCoords }
            } else {
              throw new Error(`Sibling button not found near: ${cmd.params.anchor}`)
            }
            break

          case 'findButtonNear':
            // Smart visual element matching - finds button by position/size/content
            // Much more reliable than CSS selectors!
            let visualAnchor = document.querySelector(cmd.params.anchor)
            if (!visualAnchor) throw new Error(`Anchor not found: ${cmd.params.anchor}`)

            let anchorBox = visualAnchor.getBoundingClientRect()
            let position = cmd.params.position || 'right' // right/left/above/below
            let maxDistance = cmd.params.maxDistance || 100
            let minSize = cmd.params.minSize || 20
            let maxSize = cmd.params.maxSize || 60
            let excludeText = cmd.params.excludeText || []
            let requireIcon = cmd.params.requireIcon ?? true

            // Collect all potential buttons
            let allButtons = document.querySelectorAll('button, [role="button"]')
            let bestMatch = null
            let bestScore = -1

            for (const btn of allButtons) {
              let btnRect = btn.getBoundingClientRect()
              if (btnRect.width < 1 || btnRect.height < 1) continue // invisible

              // Check position relative to anchor
              let positionOk = false
              let distance = 0

              if (position === 'right') {
                positionOk = btnRect.left >= anchorBox.right - 10
                distance = btnRect.left - anchorBox.right
              } else if (position === 'left') {
                positionOk = btnRect.right <= anchorBox.left + 10
                distance = anchorBox.left - btnRect.right
              } else if (position === 'below') {
                positionOk = btnRect.top >= anchorBox.bottom - 10
                distance = btnRect.top - anchorBox.bottom
              } else if (position === 'above') {
                positionOk = btnRect.bottom <= anchorBox.top + 10
                distance = anchorBox.top - btnRect.bottom
              } else if (position === 'any') {
                // Any direction - calculate euclidean distance from anchor center
                let anchorCenterX = anchorBox.left + anchorBox.width / 2
                let anchorCenterY = anchorBox.top + anchorBox.height / 2
                let btnCenterX = btnRect.left + btnRect.width / 2
                let btnCenterY = btnRect.top + btnRect.height / 2
                distance = Math.sqrt(Math.pow(btnCenterX - anchorCenterX, 2) + Math.pow(btnCenterY - anchorCenterY, 2))
                positionOk = true // Allow any position
              }

              if (!positionOk || distance < 0 || distance > maxDistance) continue

              // Check size
              let size = Math.max(btnRect.width, btnRect.height)
              if (size < minSize || size > maxSize) continue

              // Check for excluded text
              let btnText = btn.textContent?.toLowerCase() || ''
              if (excludeText.some(t => btnText.includes(t.toLowerCase()))) continue

              // Check for icon
              let hasIcon = btn.querySelector('svg') !== null
              if (requireIcon && !hasIcon) continue

              // Score: prefer closer buttons with matching size
              let sizeScore = 1 - Math.abs(40 - size) / 40 // prefer ~40px
              let distScore = 1 - distance / maxDistance
              let score = sizeScore * 0.4 + distScore * 0.6

              if (score > bestScore) {
                bestScore = score
                bestMatch = btn
              }
            }

            if (bestMatch) {
              let matchCoords = performCoordinateClick(bestMatch)
              let matchRect = bestMatch.getBoundingClientRect()
              result = {
                clicked: true,
                anchor: cmd.params.anchor,
                buttonTag: bestMatch.tagName,
                buttonText: bestMatch.textContent?.substring(0, 30),
                buttonSize: { width: Math.round(matchRect.width), height: Math.round(matchRect.height) },
                score: bestScore.toFixed(2),
                ...matchCoords
              }
            } else {
              throw new Error(`No matching button found near: ${cmd.params.anchor}`)
            }
            break

          case 'type':
            // Type text into element (supports input/textarea and contenteditable)
            let typeEl = document.querySelector(cmd.params.selector)
            if (!typeEl) throw new Error(`Element not found: ${cmd.params.selector}`)
            typeEl.focus()
            if (typeEl.contentEditable === 'true') {
              // Contenteditable div
              typeEl.textContent = cmd.params.text
            } else {
              // Regular input/textarea
              typeEl.value = cmd.params.text
            }
            typeEl.dispatchEvent(new Event('input', { bubbles: true }))
            result = { typed: true, text: cmd.params.text }
            break

          case 'getAttribute':
            // Get attribute from element
            let attrEl = document.querySelector(cmd.params.selector)
            if (!attrEl) throw new Error(`Element not found: ${cmd.params.selector}`)
            result = { value: attrEl.getAttribute(cmd.params.attribute) || attrEl[cmd.params.attribute] }
            break

          case 'querySelector':
            // Query selector and return element info
            let qEl = document.querySelector(cmd.params.selector)
            result = qEl ? {
              found: true,
              tag: qEl.tagName,
              id: qEl.id,
              className: qEl.className,
              text: qEl.textContent?.substring(0, 100),
              ariaLabel: qEl.getAttribute('aria-label'),
              src: qEl.src,
              value: qEl.value
            } : { found: false }
            break

          case 'querySelectorAll':
            // Query all matching elements
            let qEls = document.querySelectorAll(cmd.params.selector)
            result = {
              count: qEls.length,
              elements: Array.from(qEls).slice(0, 20).map(el => ({
                tag: el.tagName,
                id: el.id,
                className: el.className,
                ariaLabel: el.getAttribute('aria-label'),
                text: el.textContent?.substring(0, 50),
                src: el.src
              }))
            }
            break

          case 'navigate':
            // Check if already on the target URL (ignoring hash/fragments)
            let targetUrl = new URL(cmd.params.url).href.replace(/#.*$/, '')
            let currentUrl = window.location.href.replace(/#.*$/, '')

            if (currentUrl === targetUrl) {
              console.log(`[GrokBridge] Already on target URL: ${targetUrl}`)
              result = { navigated: false, alreadyThere: true }
              break
            }

            // Navigate to URL - send result FIRST, then navigate after delay
            result = { navigated: true, url: cmd.params.url }

            // Report success immediately
            await fetch(`${SERVER_URL}/commands/result`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: cmd.id, result })
            }).catch(() => { })
            logEvent('result', { id: cmd.id, success: true })

            // Then navigate after brief delay
            setTimeout(() => {
              window.location.href = cmd.params.url
            }, 300)

            // Skip normal result reporting (already done above)
            continue

          case 'refresh':
            // Refresh page - used to recover from browser throttling
            // Send result FIRST, then reload after delay
            result = { refreshed: true, url: window.location.href }

            // Report success immediately
            await fetch(`${SERVER_URL}/commands/result`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: cmd.id, result })
            })
            logEvent('result', { id: cmd.id, success: true })
            console.log('[GrokBridge] Refreshing page to recover from throttling...')

            // Then reload after brief delay
            setTimeout(() => {
              window.location.reload()
            }, 100)

            // Skip normal result reporting (already done above)
            continue


          case 'uploadFile':
            // Upload file via base64 data
            let base64 = cmd.params.base64
            let mimeType = cmd.params.mimeType || 'image/jpeg'
            let filename = cmd.params.filename || 'image.jpg'

            // Convert base64 to Blob
            let byteChars = atob(base64)
            let bytes = new Uint8Array(byteChars.length)
            for (let i = 0; i < byteChars.length; i++) {
              bytes[i] = byteChars.charCodeAt(i)
            }
            let blob = new Blob([bytes], { type: mimeType })
            let file = new File([blob], filename, { type: mimeType })

            // Find file input
            let fileInput = document.querySelector('input[type="file"]')
            if (!fileInput) throw new Error('File input not found')

            // Create DataTransfer and set files
            let dt = new DataTransfer()
            dt.items.add(file)
            fileInput.files = dt.files

            // Trigger change event
            fileInput.dispatchEvent(new Event('change', { bubbles: true }))
            result = { uploaded: true, filename, size: bytes.length }
            break

          case 'waitForSelector':
            // Wait for element to appear
            result = await new Promise((resolve, reject) => {
              let timeout = cmd.params.timeout || 30000
              let start = Date.now()
              let check = () => {
                let el = document.querySelector(cmd.params.selector)
                if (el) return resolve({ found: true, selector: cmd.params.selector })
                if (Date.now() - start > timeout) return resolve({ found: false, timeout: true })
                setTimeout(check, 500)
              }
              check()
            })
            break

          case 'getPageInfo':
            result = {
              version: VERSION,
              url: window.location.href,
              title: document.title,
              bodyText: document.body.innerText
            }
            break

          case 'getBodyText':
            result = { text: document.body.innerText }
            break

          case 'getMenuContent':
            let menuContent = Array.from(document.querySelectorAll('[role="menu"], [role="menuitem"], [data-radix-menu-content], .radix-popover-content'))
              .map(el => ({
                tag: el.tagName,
                role: el.getAttribute('role'),
                text: el.textContent?.trim(),
                className: el.className
              }))
            result = { count: menuContent.length, items: menuContent }
            break

          case 'clickByIndex': {
            let index = parseInt(cmd.params.index)
            let all = document.querySelectorAll('*')
            let el = all[index]
            if (!el) throw new Error(`Element at index ${index} not found. Total elements: ${all.length}`)
            el.click()
            result = { clicked: true, index, tag: el.tagName }
            break
          }

          case 'queryActions': {
            let all = document.querySelectorAll('button, [role="button"], [role="menuitem"], a, input, [onclick]')
            let allElements = document.querySelectorAll('*')
            let list = []
            for (const el of all) {
              // Find index in allElements
              let index = -1
              for (let i = 0; i < allElements.length; i++) {
                if (allElements[i] === el) {
                  index = i
                  break
                }
              }
              list.push({
                index,
                tag: el.tagName,
                role: el.getAttribute('role'),
                text: el.textContent?.trim().substring(0, 50),
                ariaLabel: el.getAttribute('aria-label'),
                className: el.className
              })
            }
            result = { count: list.length, actions: list }
            break
          }

          case 'getElementsAroundIndex': {
            let index = parseInt(cmd.params.index)
            let range = cmd.params.range || 10
            let all = document.querySelectorAll('*')
            let start = Math.max(0, index - range)
            let end = Math.min(all.length, index + range)
            let resultList = []
            for (let i = start; i < end; i++) {
              let el = all[i]
              resultList.push({
                index: i,
                tag: el.tagName,
                className: el.className,
                text: el.textContent?.trim().substring(0, 50),
                ariaLabel: el.getAttribute('aria-label')
              })
            }
            result = { count: resultList.length, elements: resultList }
            break
          }

          case 'findElementsByText': {
            let search = (cmd.params.text || "").toLowerCase().trim()
            let all = document.querySelectorAll('*')
            let matches = []
            for (let i = 0; i < all.length; i++) {
              let el = all[i]
              let text = el.textContent?.toLowerCase() || ""
              if (text.includes(search)) {
                matches.push({
                  index: i,
                  tag: el.tagName,
                  className: el.className,
                  text: el.textContent?.trim().substring(0, 50),
                  parentTag: el.parentElement?.tagName,
                  ariaLabel: el.getAttribute('aria-label')
                })
              }
            }
            result = { count: matches.length, matches: matches.slice(-10) } // Return last matches (usually leaf nodes)
            break
          }

          case 'getEventLog':
            result = { events: eventLog }
            break

          case 'getImageUrls':
            // Extract CDN URLs from visible images (generated images)
            let allImgs = document.querySelectorAll('img')
            let imgUrls = []
            let debugUrls = [] // For debugging
            for (const img of allImgs) {
              let src = img.src || ''
              // Log first 5 image srcs for debugging
              if (debugUrls.length < 5 && src.length > 10) {
                debugUrls.push(src.substring(0, 80))
              }
              // Match imagine-public CDN URLs (HQ generated images)
              if (src.includes('imagine-public.x.ai') || src.includes('imagine-public')) {
                imgUrls.push(src)
              }
            }
            console.log('[getImageUrls] Debug - sample URLs:', debugUrls)
            // Dedupe and return
            result = { urls: [...new Set(imgUrls)], count: imgUrls.length, debug: debugUrls }
            break

          case 'generateImage':
            // Generate image via WebSocket (uses injected WS interceptor)
            result = await new Promise((resolve, reject) => {
              let commandId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              let timeout = setTimeout(() => {
                window.removeEventListener('grok-generate-result', handler)
                reject(new Error('Generation timeout (60s)'))
              }, 60000)

              function handler(event) {
                if (event.detail.commandId !== commandId) return
                clearTimeout(timeout)
                window.removeEventListener('grok-generate-result', handler)

                if (event.detail.success) {
                  resolve(event.detail.result)
                } else {
                  reject(new Error(event.detail.error))
                }
              }

              window.addEventListener('grok-generate-result', handler)

              // Dispatch command to page context
              window.dispatchEvent(new CustomEvent('grok-generate-command', {
                detail: {
                  commandId,
                  prompt: cmd.params.prompt,
                  options: cmd.params.options || {}
                }
              }))
            })
            break

          case 'fetchImage':
            // Download image via browser (with authenticated cookies)
            let imgRes = await fetch(cmd.params.url, {
              credentials: 'include',
              headers: {
                'Referer': 'https://grok.com/imagine'
              }
            })
            if (!imgRes.ok) throw new Error(`Fetch failed: ${imgRes.status}`)
            let imgBlob = await imgRes.blob()
            let imgArrayBuffer = await imgBlob.arrayBuffer()
            let imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgArrayBuffer)))
            result = {
              success: true,
              base64: imgBase64,
              contentType: imgBlob.type,
              size: imgBlob.size
            }
            break

          case 'waitForImageComplete':
            // Wait for image generation to complete via WebSocket
            // Uses event-based communication with injected script
            result = await new Promise((resolve, reject) => {
              let commandId = `wait_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              let timeout = cmd.params.timeout || 120000

              let timeoutId = setTimeout(() => {
                window.removeEventListener('grok-wait-image-result', handler)
                reject(new Error('Timeout waiting for image completion'))
              }, timeout + 5000) // Extra buffer for WS timeout

              function handler(event) {
                if (event.detail.commandId !== commandId) return
                clearTimeout(timeoutId)
                window.removeEventListener('grok-wait-image-result', handler)

                if (event.detail.success) {
                  resolve(event.detail.result)
                } else {
                  reject(new Error(event.detail.error))
                }
              }

              window.addEventListener('grok-wait-image-result', handler)

              // Dispatch command to page context
              window.dispatchEvent(new CustomEvent('grok-wait-image-command', {
                detail: { commandId, timeout }
              }))
            })
            break

          case 'uploadImage':
            // Upload image to Grok and get asset ID
            // params: { base64, fileName, mimeType }
            let uploadRes = await fetch('https://grok.com/rest/app-chat/upload-file', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: cmd.params.fileName || 'image.jpg',
                fileMimeType: cmd.params.mimeType || 'image/jpeg',
                content: cmd.params.base64
              })
            })
            if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)
            let uploadData = await uploadRes.json()
            // Response has fileMetadataId, not fileId
            let assetId = uploadData.fileMetadataId
            let userId = uploadData.fileUri?.split('/')[1]
            result = {
              success: true,
              assetId,
              userId,
              assetUrl: `https://assets.grok.com/${uploadData.fileUri}`,
              data: uploadData
            }
            break

          case 'createMediaPost':
            // Create media post from uploaded asset
            // params: { assetId, mediaType }
            let assetUrl = `https://assets.grok.com/users/${cmd.params.userId}/${cmd.params.assetId}/content`
            let postRes = await fetch('https://grok.com/rest/media/post/create', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mediaType: cmd.params.mediaType || 'MEDIA_POST_TYPE_IMAGE',
                mediaUrl: assetUrl
              })
            })
            if (!postRes.ok) throw new Error(`Create post failed: ${postRes.status}`)
            result = { success: true, data: await postRes.json() }
            break

          case 'imageToVideo':
            // Generate video from uploaded image (via page context to bypass anti-bot)
            // params: { assetId, assetUrl, prompt, aspectRatio, videoLength, mode }
            result = await new Promise((resolve, reject) => {
              let videoCommandId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

              let handler = (event) => {
                if (event.detail.commandId !== videoCommandId) return;
                window.removeEventListener('grok-video-result', handler);

                if (event.detail.success) {
                  resolve(event.detail.result);
                } else {
                  reject(new Error(event.detail.error));
                }
              };

              window.addEventListener('grok-video-result', handler);

              // Timeout
              setTimeout(() => {
                window.removeEventListener('grok-video-result', handler);
                reject(new Error('Video generation timeout (120s)'));
              }, 120000);

              window.dispatchEvent(new CustomEvent('grok-video-command', {
                detail: {
                  action: 'imageToVideo',
                  commandId: videoCommandId,
                  params: cmd.params
                }
              }));
            });
            result = { success: true, data: result };
            break

          case 'upscaleVideo':
            // Upscale a generated video (via page context to bypass anti-bot)
            // params: { videoId }
            result = await new Promise((resolve, reject) => {
              let upscaleCommandId = `upscale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

              let handler = (event) => {
                if (event.detail.commandId !== upscaleCommandId) return;
                window.removeEventListener('grok-video-result', handler);

                if (event.detail.success) {
                  resolve(event.detail.result);
                } else {
                  reject(new Error(event.detail.error));
                }
              };

              window.addEventListener('grok-video-result', handler);

              setTimeout(() => {
                window.removeEventListener('grok-video-result', handler);
                reject(new Error('Upscale timeout (60s)'));
              }, 60000);

              window.dispatchEvent(new CustomEvent('grok-video-command', {
                detail: {
                  action: 'upscaleVideo',
                  commandId: upscaleCommandId,
                  params: cmd.params
                }
              }));
            });
            result = { success: true, data: result };
            break

          case 'showClickableZones':
            // Show numbered overlay on all clickable elements
            // Helps identify which zone to click
            // layer param: 'all' (default), 'buttons', 'inputs', 'images'
            let layer = cmd.params?.layer || 'all'
            let existingOverlay = document.getElementById('grok-zones-overlay')
            if (existingOverlay) existingOverlay.remove()

            let overlay = document.createElement('div')
            overlay.id = 'grok-zones-overlay'
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999'

            let showButtons = layer === 'all' || layer === 'buttons'
            let showInputs = layer === 'all' || layer === 'inputs'
            let showImages = layer === 'all' || layer === 'images'

            let clickables = showButtons ? document.querySelectorAll('button, [role="button"], a, input[type="submit"], [onclick], .cursor-pointer') : []
            let inputEls = showInputs ? document.querySelectorAll('input:not([type="submit"]):not([type="hidden"]), textarea, [contenteditable="true"]') : []
            let zones = []

            // Separate counters for each type
            let btnNum = 1
            let inputNum = 1
            let imgNum = 1

            // Add clickable elements (red) - B1, B2, B3...
            clickables.forEach(el => {
              let rect = el.getBoundingClientRect()
              if (rect.width < 10 || rect.height < 10) return
              if (rect.top < -50 || rect.left < -50) return

              let zoneId = `B${btnNum}`
              let label = document.createElement('div')
              label.style.cssText = `
                position:fixed;
                left:${rect.left}px;
                top:${rect.top}px;
                width:${rect.width}px;
                height:${rect.height}px;
                border:2px solid red;
                background:rgba(255,0,0,0.1);
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:14px;
                font-weight:bold;
                color:white;
                text-shadow:0 0 3px black;
                pointer-events:none;
              `
              label.textContent = zoneId
              overlay.appendChild(label)

              zones.push({
                id: zoneId,
                num: btnNum,
                type: 'button',
                tag: el.tagName,
                text: el.textContent?.substring(0, 30).trim() || '',
                ariaLabel: el.getAttribute('aria-label') || '',
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
              })
              btnNum++
            })

            // Add input elements (green) - I1, I2, I3...
            inputEls.forEach(el => {
              let rect = el.getBoundingClientRect()
              if (rect.width < 10 || rect.height < 10) return
              if (rect.top < -50 || rect.left < -50) return

              let zoneId = `I${inputNum}`
              let label = document.createElement('div')
              label.style.cssText = `
                position:fixed;
                left:${rect.left}px;
                top:${rect.top}px;
                width:${rect.width}px;
                height:${rect.height}px;
                border:2px solid #00ff00;
                background:rgba(0,255,0,0.1);
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:14px;
                font-weight:bold;
                color:white;
                text-shadow:0 0 3px black;
                pointer-events:none;
              `
              label.textContent = zoneId
              overlay.appendChild(label)

              zones.push({
                id: zoneId,
                num: inputNum,
                type: 'input',
                tag: el.tagName,
                placeholder: el.getAttribute('placeholder') || '',
                ariaLabel: el.getAttribute('aria-label') || '',
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
              })
              inputNum++
            })

            // Add image elements (blue - clickable images in galleries)
            let images = showImages ? document.querySelectorAll('img[src*="imagine"], img[src*="grok"], img[alt*="image"], div.group\\/media-post-masonry-card img') : []
            images.forEach(el => {
              let rect = el.getBoundingClientRect()
              if (rect.width < 20 || rect.height < 20) return
              if (rect.top < -50 || rect.left < -50) return

              let zoneId = `M${imgNum}`
              let label = document.createElement('div')
              label.style.cssText = `
                position:fixed;
                left:${rect.left}px;
                top:${rect.top}px;
                width:${rect.width}px;
                height:${rect.height}px;
                border:3px solid #00bfff;
                background:rgba(0,191,255,0.15);
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:18px;
                font-weight:bold;
                color:white;
                text-shadow:0 0 5px black;
                pointer-events:none;
              `
              label.textContent = zoneId
              overlay.appendChild(label)

              zones.push({
                id: zoneId,
                num: imgNum,
                type: 'image',
                tag: el.tagName,
                src: el.src?.substring(0, 50) || '',
                alt: el.getAttribute('alt') || '',
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
              })
              imgNum++
            })

            document.body.appendChild(overlay)

            // Store zones in window for clickZone command
            window._grokClickZones = zones

            // Auto-hide after 30 seconds
            setTimeout(() => overlay.remove(), 30000)

            result = { zones: zones.slice(0, 50), total: zones.length }
            break

          case 'clickZone':
            // Click element by zone ID from showClickableZones
            // Supports both string IDs (B13, I2, M1) and legacy number format
            let clickZoneId = cmd.params.zone
            if (!window._grokClickZones) throw new Error('Run showClickableZones first')

            // Find by id (string like 'B13') or num (number like 13 for legacy)
            let clickZone = window._grokClickZones.find(z =>
              z.id === clickZoneId || z.id === String(clickZoneId) || z.num === clickZoneId
            )
            if (!clickZone) throw new Error(`Zone ${clickZoneId} not found`)

            // Find element at zone coordinates
            let clickZoneEl = document.elementFromPoint(clickZone.x, clickZone.y)
            if (clickZoneEl) {
              let clickZoneCoords = performCoordinateClick(clickZoneEl)
              result = { clicked: true, zone: clickZoneId, id: clickZone.id, tag: clickZoneEl.tagName, ...clickZoneCoords }
            } else {
              throw new Error(`No element at zone ${clickZoneId} coordinates`)
            }
            break

          case 'hideZones':
            // Remove zones overlay
            let zoneOverlay = document.getElementById('grok-zones-overlay')
            if (zoneOverlay) zoneOverlay.remove()
            delete window._grokClickZones
            result = { hidden: true }
            break

          case 'waitForZone':
            // Wait for a specific zone to appear by periodically refreshing zones
            // Returns when the zone is found
            let waitZoneId = cmd.params.zone
            let waitTimeout = cmd.params.timeout || 30000
            let waitStart = Date.now()

            while (Date.now() - waitStart < waitTimeout) {
              // Refresh zones list
              let showButtons = true
              let showInputs = true
              let showImages = true

              let allClickables = document.querySelectorAll('button, [role="button"], a, input[type="submit"], [onclick], .cursor-pointer')
              let allInputs = document.querySelectorAll('input:not([type="submit"]):not([type="hidden"]), textarea, [contenteditable="true"]')
              let allImages = document.querySelectorAll('img[src*="imagine"], img[src*="grok"], img[alt*="image"], div.group\\/media-post-masonry-card img')

              let foundZones = []
              let btn = 1, inp = 1, img = 1

              allClickables.forEach(el => {
                let rect = el.getBoundingClientRect()
                if (rect.width >= 10 && rect.height >= 10 && rect.top > -50 && rect.left > -50) {
                  foundZones.push({ id: `B${btn}`, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
                  btn++
                }
              })
              allInputs.forEach(el => {
                let rect = el.getBoundingClientRect()
                if (rect.width >= 10 && rect.height >= 10 && rect.top > -50 && rect.left > -50) {
                  foundZones.push({ id: `I${inp}`, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
                  inp++
                }
              })
              allImages.forEach(el => {
                let rect = el.getBoundingClientRect()
                if (rect.width >= 20 && rect.height >= 20 && rect.top > -50 && rect.left > -50) {
                  foundZones.push({ id: `M${img}`, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
                  img++
                }
              })

              let foundZone = foundZones.find(z => z.id === waitZoneId)
              if (foundZone) {
                // Store zones for subsequent clickZone calls
                window._grokClickZones = foundZones
                result = { found: true, zone: waitZoneId, elapsed: Date.now() - waitStart }
                break
              }

              await new Promise(r => setTimeout(r, 500))
            }

            if (!result) {
              throw new Error(`Timeout waiting for zone ${waitZoneId}`)
            }
            break

          case 'typeInZone':
            // Type text into input zone
            // Supports string IDs (I1, I2) and legacy numbers
            let zoneTypeId = cmd.params.zone
            let zoneTypeText = cmd.params.text
            if (!window._grokClickZones) throw new Error('Run showClickableZones first')

            // Find by id (string like 'I1') or num (number for legacy)
            let zoneForType = window._grokClickZones.find(z =>
              z.id === zoneTypeId || z.id === String(zoneTypeId) || z.num === zoneTypeId
            )
            if (!zoneForType) throw new Error(`Zone ${zoneTypeId} not found`)

            let zoneInputEl = document.elementFromPoint(zoneForType.x, zoneForType.y)
            if (!zoneInputEl) throw new Error(`No element at zone ${zoneTypeId}`)

            zoneInputEl.focus()

            // Handle both regular inputs and contenteditable elements
            if (zoneInputEl.tagName === 'INPUT' || zoneInputEl.tagName === 'TEXTAREA') {
              zoneInputEl.value = zoneTypeText
            } else if (zoneInputEl.contentEditable === 'true' || zoneInputEl.isContentEditable) {
              // For contenteditable (like TipTap ProseMirror)
              zoneInputEl.textContent = zoneTypeText
            } else {
              // Fallback - try both approaches
              if ('value' in zoneInputEl) {
                zoneInputEl.value = zoneTypeText
              } else {
                zoneInputEl.textContent = zoneTypeText
              }
            }

            zoneInputEl.dispatchEvent(new Event('input', { bubbles: true }))
            zoneInputEl.dispatchEvent(new Event('change', { bubbles: true }))

            result = { typed: true, zone: zoneTypeId, id: zoneForType.id, text: zoneTypeText, tag: zoneInputEl.tagName }
            break

          default:
            throw new Error(`Unknown action: ${cmd.action}`)
        }

        // Report success
        await fetch(`${SERVER_URL}/commands/result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cmd.id, result })
        })
        logEvent('result', { id: cmd.id, success: true })

      } catch (err) {
        console.error(`[GrokBridge] Error:`, err)
        await fetch(`${SERVER_URL}/commands/result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cmd.id, error: err.message })
        })
        logEvent('error', { id: cmd.id, error: err.message })
      }
    }
  } catch (err) {
    // Server not available - silent
  }
}

/**
 * Execute JavaScript code in page context via script injection
 * Bypasses CSP by using content script's trusted context
 * @param {string} code - JavaScript code to execute
 */
async function evaluateJS(code) {
  console.log(`[GrokBridge] Eval:`, code.substring(0, 100))

  return new Promise((resolve, reject) => {
    let messageId = `grok_eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Listen for result via postMessage (works across context boundaries)
    function handleMessage(event) {
      if (event.source !== window) return
      if (event.data?.type !== 'GROK_EVAL_RESULT') return
      if (event.data?.id !== messageId) return

      window.removeEventListener('message', handleMessage)

      if (event.data.error) {
        reject(new Error(`JS Error: ${event.data.error}`))
      } else {
        resolve(serializeResult(event.data.result))
      }
    }

    window.addEventListener('message', handleMessage)

    // Wrap code to post result back via postMessage
    let wrappedCode = `
      (async () => {
        try {
          let result = await (async () => { ${code} })()
          window.postMessage({
            type: 'GROK_EVAL_RESULT',
            id: '${messageId}',
            result: result
          }, '*')
        } catch (e) {
          window.postMessage({
            type: 'GROK_EVAL_RESULT',
            id: '${messageId}',
            error: e.message
          }, '*')
        }
      })()
    `

    // Inject script tag (runs in page context)
    let script = document.createElement('script')
    script.textContent = wrappedCode
    document.documentElement.appendChild(script)
    script.remove()

    // Timeout fallback
    setTimeout(() => {
      window.removeEventListener('message', handleMessage)
      reject(new Error('Eval timeout'))
    }, 30000)
  })
}

/**
 * Serialize result for JSON transport
 * Handles DOM elements, arrays, objects
 */
function serializeResult(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value

  // DOM Element
  if (value instanceof Element) {
    return {
      _type: 'Element',
      tagName: value.tagName,
      id: value.id || null,
      className: value.className || null,
      textContent: value.textContent?.substring(0, 200),
      innerHTML: value.innerHTML?.substring(0, 500)
    }
  }

  // NodeList / HTMLCollection
  if (value instanceof NodeList || value instanceof HTMLCollection) {
    return Array.from(value).map(serializeResult)
  }

  // Array
  if (Array.isArray(value)) {
    return value.map(serializeResult)
  }

  // Object
  if (typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return String(value)
    }
  }

  return String(value)
}

// === ANTI-THROTTLING POLLING ===
// Chrome throttles setInterval in background tabs. Using recursive setTimeout
// with visibility detection helps diagnose throttling issues.

let lastPollTime = Date.now()
let pollCount = 0
let isTabVisible = !document.hidden

// Track visibility changes
document.addEventListener('visibilitychange', () => {
  isTabVisible = !document.hidden
  console.log(`[GrokBridge] Tab visibility: ${isTabVisible ? 'VISIBLE' : 'HIDDEN'}`)
  if (isTabVisible) {
    // Tab became visible - check if we missed polls
    let elapsed = Date.now() - lastPollTime
    if (elapsed > 5000) {
      console.log(`[GrokBridge] ⚠️ Missed polls! Last poll ${Math.round(elapsed / 1000)}s ago. Chrome throttled us.`)
    }
    // Force immediate poll when tab becomes visible
    pollForCommands()
  }
})

// Recursive polling with heartbeat logging
function startPolling() {
  pollCount++
  lastPollTime = Date.now()

  // Log heartbeat every 30 polls (~30s) to confirm we're alive
  if (pollCount % 30 === 0) {
    console.log(`[GrokBridge] ♥ Heartbeat #${pollCount}, tab ${isTabVisible ? 'visible' : 'hidden'}`)
  }

  pollForCommands()
  setTimeout(startPolling, POLL_INTERVAL)
}

// Start polling
startPolling()

// Listen for messages from sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    sendResponse({
      url: window.location.href,
      title: document.title
    })
  }
  if (request.action === 'getEventLog') {
    sendResponse({ events: eventLog })
  }
  return true
})

logEvent('info', 'DOM Gateway initialized')

// === ACTION RECORDING ===
// Capture user clicks and send to server for analysis

/**
 * Get a unique CSS selector for an element
 */
function getSelector(el) {
  if (!el || el === document.body) return 'body'

  // Priority: aria-label > id > unique class > nth-child
  if (el.getAttribute('aria-label')) {
    return `[aria-label="${el.getAttribute('aria-label')}"]`
  }
  if (el.id) {
    return `#${el.id}`
  }

  // Build path
  let path = []
  while (el && el !== document.body) {
    let selector = el.tagName.toLowerCase()
    if (el.className && typeof el.className === 'string') {
      let classes = el.className.trim().split(/\s+/).filter(c => !c.includes('__') && c.length < 30).slice(0, 2)
      if (classes.length) selector += '.' + classes.join('.')
    }
    path.unshift(selector)
    el = el.parentElement
    if (path.length > 3) break
  }
  return path.join(' > ')
}

/**
 * Record user actions
 */
let recordingEnabled = true // Always on for now

document.addEventListener('click', (e) => {
  if (!recordingEnabled) return

  let el = e.target
  let rect = el.getBoundingClientRect()
  let computed = window.getComputedStyle(el)

  // Get parent button if clicking inside one (svg/path inside button)
  let parentBtn = el.closest('button, [role="button"]')
  let parentRect = parentBtn ? parentBtn.getBoundingClientRect() : null

  let action = {
    type: 'click',
    timestamp: Date.now(),
    // Basic info
    tag: el.tagName,
    id: el.id || null,
    className: el.className || null,
    ariaLabel: el.getAttribute('aria-label'),
    text: el.textContent?.substring(0, 50).trim() || null,
    role: el.getAttribute('role'),
    selector: getSelector(el),
    url: window.location.href,
    // IMG/A specific - capture actual file URLs
    src: el.tagName === 'IMG' ? el.src : null,
    href: el.tagName === 'A' ? el.href : null,
    // Size and position
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    },
    // Shape analysis
    shape: rect.width === rect.height ? 'square' : (rect.width > rect.height * 1.5 ? 'wide' : 'tall'),
    // Content type
    hasIcon: el.querySelector('svg') !== null || el.tagName === 'SVG' || el.tagName === 'path',
    // Parent button info (if clicking svg inside button)
    parentButton: parentBtn ? {
      tag: parentBtn.tagName,
      ariaLabel: parentBtn.getAttribute('aria-label'),
      text: parentBtn.textContent?.substring(0, 30).trim(),
      rect: parentRect ? {
        x: Math.round(parentRect.x),
        y: Math.round(parentRect.y),
        width: Math.round(parentRect.width),
        height: Math.round(parentRect.height)
      } : null
    } : null,
    // Display info
    display: computed.display,
    visibility: computed.visibility
  }

  console.log('[GrokBridge] Action:', action.type, action.selector)

  // Send to server
  fetch(`${SERVER_URL}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action)
  }).catch(() => { })
}, true)

// Input/change events
document.addEventListener('input', (e) => {
  if (!recordingEnabled) return

  let el = e.target
  let action = {
    type: 'input',
    timestamp: Date.now(),
    tag: el.tagName,
    selector: getSelector(el),
    value: el.value?.substring(0, 100) || el.textContent?.substring(0, 100),
    url: window.location.href
  }

  // Debounce: only send after pause
  clearTimeout(el._inputTimeout)
  el._inputTimeout = setTimeout(() => {
    fetch(`${SERVER_URL}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    }).catch(() => { })
  }, 500)
}, true)

console.log('[GrokBridge] Action recording enabled')

  // === WEBSOCKET INTERCEPTOR ===
  // Inject via external script file to bypass CSP (no inline scripts allowed)

  ; (function injectWebSocketInterceptorSync() {
    let script = document.createElement('script');
    script.src = chrome.runtime.getURL('websocket-interceptor.js');
    script.onload = () => {
      script.remove();
      console.log('[GrokBridge] WebSocket interceptor loaded via src');
    };
    script.onerror = (e) => console.error('[GrokBridge] Failed to load WS interceptor:', e);
    (document.documentElement || document.head || document.body).appendChild(script);
  })();

// Listen for WebSocket messages from injected script
window.addEventListener('grok-ws-message', (event) => {
  let message = event.detail;
  console.log(`[GrokBridge] WS ${message.direction}:`, message.data?.substring?.(0, 200) || message.data);

  // Send to server for analysis
  fetch(`${SERVER_URL}/websocket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  }).catch(() => { });
});

// Listen for Fetch API calls from injected script
window.addEventListener('grok-fetch', (event) => {
  let logEntry = event.detail;
  console.log(`[GrokBridge] Fetch: ${logEntry.method} ${logEntry.url}`);

  // Send to server for analysis
  fetch(`${SERVER_URL}/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logEntry)
  }).catch(() => { });
});
