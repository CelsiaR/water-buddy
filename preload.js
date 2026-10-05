const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("celsi", {
  hide: () => ipcRenderer.send("celsi:hide"),
  next: (minutes) => ipcRenderer.send("celsi:next", minutes),
  clickable: (on) => ipcRenderer.send("celsi:clickable", !!on),
  getCharacter: () => ipcRenderer.invoke("celsi:character"),
  getConfig: () => ipcRenderer.invoke("celsi:config"),
  onShow: (cb) => ipcRenderer.on("celsi:show", (_e, data) => cb(data))
});
