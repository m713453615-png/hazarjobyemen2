const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('hazarDesktop', {
  platform: process.platform,
  isDesktop: true,
})
