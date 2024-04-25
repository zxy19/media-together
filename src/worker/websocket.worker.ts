/// <reference lib="webworker" />
const webWorker: Worker = self as any;
import { Events } from "../utils/events";
var events = new Events<any>();
var ws: WebSocket | undefined;
webWorker.onmessage = (e) => {
  events.emit(e.data.type, e.data.data);
};

events.on('send', (data) => {
  if (ws) {
    ws.send(data);
  }
})
events.on('rev', (data) => {
  webWorker.postMessage({ type: "rev", data });
})

events.on('open', (data) => {
  ws = new WebSocket(data.url);
  ws.onopen = () => {
    webWorker.postMessage({ type: "open" });
  }
  ws.onmessage = (e) => {
    events.emit('rev', JSON.parse(e.data));
  }
  ws.onclose = ws.onerror = () => {
    ws = undefined;
    webWorker.postMessage({ type: "closed" });
  }
})