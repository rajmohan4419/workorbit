import { useAuthStore } from '../../store/authStore'
import { useWorkspaceStore } from '../../store/workspaceStore'

// Keep original console references to allow logging without interception
export const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
}

// Config from Vite environment variables
const LOKI_URL = import.meta.env.VITE_LOKI_URL
const LOKI_USER = import.meta.env.VITE_LOKI_USER
const LOKI_TOKEN = import.meta.env.VITE_LOKI_TOKEN
const LOKI_TENANT_ID = import.meta.env.VITE_LOKI_TENANT_ID
const LOKI_ENABLED = import.meta.env.VITE_LOKI_ENABLED !== 'false' && !!LOKI_URL

// Internal state
let logBuffer = []
let flushTimer = null
let isInternalLogging = false
let initialized = false

const BUFFER_LIMIT = 50
const FLUSH_INTERVAL_MS = 5000 // Flush every 5 seconds

// State to generate unique nanosecond-precision timestamps
let lastTimestamp = 0
let counter = 0

/**
 * Generates a unique nanosecond-precision timestamp as a string.
 * This guarantees strictly increasing, unique timestamps even if logs are generated within the same millisecond.
 */
function getNanosecondTimestamp() {
  const now = Date.now()
  if (now === lastTimestamp) {
    counter++
  } else {
    lastTimestamp = now
    counter = 0
  }
  const nano = BigInt(now) * 1000000n + BigInt(counter)
  return nano.toString()
}

/**
 * Retrieves the current authenticated user and active workspace IDs on demand.
 * This prevents circular/early loading issues since the stores are queried dynamically at logging time.
 */
function getDynamicContext() {
  let userId = null
  let userEmail = null
  let workspaceId = null

  try {
    const authState = useAuthStore.getState()
    if (authState?.user) {
      userId = authState.user.id
      userEmail = authState.user.email
    }
  } catch {
    // Ignore context extraction failures
  }

  try {
    const workspaceState = useWorkspaceStore.getState()
    if (workspaceState?.activeWorkspace) {
      workspaceId = workspaceState.activeWorkspace.id
    }
  } catch {
    // Ignore context extraction failures
  }

  return { userId, userEmail, workspaceId }
}

/**
 * Helper to serialize arbitrary console arguments to a single string representation.
 */
function formatArgs(args) {
  return args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.message}\nStack: ${arg.stack}`
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    }
    return String(arg)
  }).join(' ')
}

/**
 * Core log aggregator that queues logs in a local buffer.
 */
function handleLog(level, args) {
  // Never intercept logs if we are in the middle of sending to Loki to prevent stack overflows
  if (isInternalLogging) return

  const entry = {
    timestamp: getNanosecondTimestamp(),
    level,
    message: formatArgs(args),
    context: {
      url: typeof window !== 'undefined' ? window.location.href : '',
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      ...getDynamicContext()
    }
  }

  logBuffer.push(entry)

  // Immediate flush for critical errors or when capacity limit is reached
  if (level === 'error' || logBuffer.length >= BUFFER_LIMIT) {
    loggerService.flush()
  }
}

export const loggerService = {
  /**
   * Initializes the Grafana Loki logger service.
   * Intercepts standard console logging methods, starts interval-based flushing,
   * and registers listeners for final log transmission on page unload.
   */
  init() {
    if (initialized) return
    initialized = true

    if (!LOKI_ENABLED) {
      originalConsole.log('[Loki Logger] Disabled. Grafana Loki logs will not be sent.')
      return
    }

    originalConsole.log(`[Loki Logger] Initialized. Target: ${LOKI_URL}`)

    // Intercept console functions
    console.log = (...args) => {
      originalConsole.log(...args)
      handleLog('info', args)
    }

    console.info = (...args) => {
      originalConsole.info(...args)
      handleLog('info', args)
    }

    console.warn = (...args) => {
      originalConsole.warn(...args)
      handleLog('warn', args)
    }

    console.error = (...args) => {
      originalConsole.error(...args)
      handleLog('error', args)
    }

    console.debug = (...args) => {
      originalConsole.debug(...args)
      handleLog('debug', args)
    }

    // Interval flushing
    flushTimer = setInterval(() => {
      this.flush()
    }, FLUSH_INTERVAL_MS)

    // Unload flushing (using keepalive fetch to ensure delivery)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush({ keepalive: true })
      })
    }
  },

  /**
   * Manually logs an informational message.
   */
  info(message, ...extra) {
    handleLog('info', [message, ...extra])
  },

  /**
   * Manually logs a warning.
   */
  warn(message, ...extra) {
    handleLog('warn', [message, ...extra])
  },

  /**
   * Manually logs an error.
   */
  error(message, ...extra) {
    handleLog('error', [message, ...extra])
  },

  /**
   * Manually logs a debug message.
   */
  debug(message, ...extra) {
    handleLog('debug', [message, ...extra])
  },

  /**
   * Flushes any buffered logs directly to the Grafana Loki push API.
   * @param {object} options Optional fetch configuration (e.g., { keepalive: true })
   */
  async flush(options = {}) {
    if (!LOKI_ENABLED || logBuffer.length === 0 || isInternalLogging) {
      if (!LOKI_ENABLED && logBuffer.length > 0) {
        logBuffer = [] // Discard buffered logs if disabled
      }
      return
    }

    const logsToFlush = [...logBuffer]
    logBuffer = []

    isInternalLogging = true

    try {
      // Group logs by level to minimize the number of Loki streams
      const groupedByLevel = {}
      logsToFlush.forEach(log => {
        if (!groupedByLevel[log.level]) {
          groupedByLevel[log.level] = []
        }
        const serializedLogLine = JSON.stringify({
          message: log.message,
          context: log.context
        })
        groupedByLevel[log.level].push([log.timestamp, serializedLogLine])
      })

      // Map grouped logs to Loki stream formats
      const streams = Object.entries(groupedByLevel).map(([level, values]) => ({
        stream: {
          app: 'orbitboard',
          env: import.meta.env.MODE || 'development',
          source: 'frontend',
          level
        },
        values
      }))

      const payload = { streams }

      // Build push request headers
      const headers = {
        'Content-Type': 'application/json',
      }

      if (LOKI_TOKEN) {
        if (LOKI_USER) {
          try {
            const rawAuth = `${LOKI_USER}:${LOKI_TOKEN}`
            const auth = btoa(unescape(encodeURIComponent(rawAuth)))
            headers['Authorization'] = `Basic ${auth}`
          } catch (e) {
            originalConsole.error('[Loki Logger] Failed to encode authorization headers:', e)
          }
        } else {
          if (LOKI_TOKEN.startsWith('Bearer ') || LOKI_TOKEN.startsWith('Basic ')) {
            headers['Authorization'] = LOKI_TOKEN
          } else {
            headers['Authorization'] = `Bearer ${LOKI_TOKEN}`
          }
        }
      }

      if (LOKI_TENANT_ID) {
        headers['X-Scope-OrgID'] = LOKI_TENANT_ID
      }

      let pushUrl = LOKI_URL.replace(/\/$/, '')
      if (!pushUrl.endsWith('/loki/api/v1/push')) {
        pushUrl = `${pushUrl}/loki/api/v1/push`
      }

      const response = await fetch(pushUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        ...options
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        originalConsole.error(`[Loki Logger] Push failed with status ${response.status}: ${errorText}`)
      }
    } catch (err) {
      originalConsole.error('[Loki Logger] Failed to transmit logs to Loki:', err)
    } finally {
      isInternalLogging = false
    }
  },

  /**
   * Helper to retrieve currently buffered logs (useful for testing/verification).
   */
  getBuffer() {
    return logBuffer
  },

  /**
   * Helper to clear buffered logs (useful for testing/verification).
   */
  clearBuffer() {
    logBuffer = []
  },

  /**
   * Clean up hooks/intervals (primarily for hot reloading or testing).
   */
  destroy() {
    if (flushTimer) {
      clearInterval(flushTimer)
      flushTimer = null
    }
    initialized = false
  }
}
