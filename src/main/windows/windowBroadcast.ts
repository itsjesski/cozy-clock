import { BrowserWindow } from 'electron'

export function broadcastToAllWindows(channel: string, payload: unknown): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(channel, payload)
  })
}
