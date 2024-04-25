import { Events } from "../utils/events";
import { host } from "../config/net";
export class Room {
    ws?: WebSocket
    roomId: number
    isOpen: boolean
    userId: number
    userName: string
    isReleased: boolean = false;
    cb: (data: { type: string, [key: string]: any }) => void
    send(msg: string | Object) {
        if (this.ws) {
            let toSend: string;
            if (typeof msg != 'string') {
                (msg as any)["id"] = this.userId;
                toSend = JSON.stringify(msg);
            } else {
                toSend = msg;
            }
            this.ws.send(toSend);
        }
    }
    reconnect(force?: boolean) {
        if (this.isReleased) return;
        if (this.isOpen && !force) return;
        this.isOpen = true;
        if (this.ws) {
            try { this.ws.close(); } catch (e) { }
        }
        if (location.hostname == "127.0.0.1" || location.hostname == "localhost" || location.hostname.startsWith("192.168.")) {
            this.ws = new WebSocket(`ws://${location.hostname}:19982/`);
        } else this.ws = new WebSocket(host);
        this.ws.onopen = () => {
            this.send({
                type: 'reg',
                id: this.userId,
                group: this.roomId,
                name: this.userName
            });
            this.cb({
                type: 'open',
                msg: '重新建立连接'
            })
        }
        let hasError = false;
        this.ws.onclose = this.ws.onerror = () => {
            if (hasError) return;
            hasError = true;
            this.ws!.onclose = this.ws!.onerror = null;
            this.cb({
                type: 'disconnected',
                msg: '与服务器的连接断开，正在重连...'
            })
            setTimeout(() => {
                this.isOpen = false;
                this.reconnect();
            }, 1000);
        }
        this.ws.onmessage = (e) => {
            let data = JSON.parse(e.data);
            this.cb(data);
        }
    }
    constructor(id: number, userId: number, userName: string, cb: (data: { type: string, [key: string]: any }) => void) {
        this.roomId = id;
        this.userId = userId;
        this.userName = userName;
        this.cb = cb;
        this.isOpen = false;
        this.reconnect();
    }
    release() {
        this.isReleased = true;
        if (this.ws) {
            this.ws!.onclose = this.ws!.onerror = null!;
            this.ws?.close();
        }
        this.cb = null!;
    }
}
export class RoomWithWorker {
    ws?: WebSocket
    roomId: number
    isOpen: boolean
    userId: number
    userName: string
    isReleased: boolean = false;
    cb: (data: { type: string, [key: string]: any }) => void

    worker: Worker
    events: Events<any>
    isDisconnected: boolean = false
    constructor(id: number, userId: number, userName: string, cb: (data: { type: string, [key: string]: any }) => void) {
        this.roomId = id;
        this.userId = userId;
        this.userName = userName;
        this.cb = cb;
        this.isOpen = false;
        this.worker = new Worker(new URL('../worker/websocket.worker', import.meta.url), { type: 'module' });
        this.events = new Events();
        this.worker.onmessage = (e) => {
            this.events.emit(e.data.type, e.data.data);
        }
        this.events.on('open', () => {
            this.send({
                type: 'reg',
                id: this.userId,
                group: this.roomId,
                name: this.userName
            });
            this.cb({
                type: 'open',
                msg: '重新建立连接'
            })
        })
        this.events.on('closed', () => {
            if (this.isDisconnected) return;
            this.isDisconnected = true;
            this.cb({
                type: 'disconnected',
                msg: '与服务器的连接断开，正在重连...'
            })
            setTimeout(() => {
                this.isOpen = false;
                this.reconnect();
            }, 1000);
        })
        this.events.on('rev', (data) => {
            this.cb(data);
        })
        this.reconnect();
    }

    send(msg: string | Object) {
        let toSend: string;
        if (typeof msg != 'string') {
            (msg as any)["id"] = this.userId;
            toSend = JSON.stringify(msg);
        } else {
            toSend = msg;
        }
        this.worker.postMessage({ type: "send", data: toSend });
    }
    reconnect(force?: boolean): void {
        if (this.isReleased) return;
        if (this.isOpen && !force) return;
        this.isOpen = true;
        this.isDisconnected = false;
        let url: string
        if (location.hostname == "127.0.0.1" || location.hostname == "localhost" || location.hostname.startsWith("192.168.")) {
            url = `ws://${location.hostname}:19982/`;
        } else url = host;
        this.worker.postMessage({ type: "open", data: { url } });
    }

}