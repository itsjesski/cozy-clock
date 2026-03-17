import { logError } from './logger'

export function registerGlobalProcessErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error)
    logError('Uncaught exception', error)
  })

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error)
    logError('Unhandled rejection', error)
  })
}
