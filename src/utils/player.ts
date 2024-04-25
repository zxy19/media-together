import { MEDIA_TYPE, Media } from "../types/media-item";
import { Events } from "../utils/events";
import { MediaListManager } from "../utils/mediaListUtil";

export class PlayController {
    private ctr: HTMLDivElement
    private mediaList: MediaListManager
    private current: number
    private preLoaded: Record<number, (HTMLAudioElement | HTMLVideoElement)> = {}
    private preLoadDone: Record<number, boolean> = {}
    private status: Record<number, "loading" | "playing" | "pause" | "waiting"> = {}
    private events: Events<any>
    private lstRep: number
    private volume: number
    constructor(ctrEl: HTMLDivElement, mediaList: MediaListManager, events: Events<any>) {
        this.ctr = ctrEl;
        this.mediaList = mediaList;
        this.events = events;
        this.current = -1
        this.lstRep = 0;
        setInterval(this.sendRep.bind(this), 500);
    }
    sendRep() {
        if (!this.preLoaded[this.current]) return;
        if (this.lstRep != this.preLoaded[this.current].currentTime) {
            if (this.lstRep == -1) {
                this.lstRep = this.preLoaded[this.current].currentTime;
                return;
            }
            let diff = Math.abs(this.lstRep - this.preLoaded[this.current].currentTime);
            if (diff < 0.15) {
                return
            }
            if (diff > 1) {
                this.lstRep = this.preLoaded[this.current].currentTime;
                this.events.emit('seek', { time: Math.floor(this.lstRep * 1000), index: this.current });
            } else {
                this.lstRep = this.preLoaded[this.current].currentTime;
                this.events.emit('rep', { time: Math.floor(this.lstRep * 1000) });
            }
        }
    }
    play(index: number) {
        if (this.preLoaded[index] && this.preLoadDone[index]) {
            this.preLoaded[index].volume = this.volume;
            this.preLoaded[index].play();
            this.status[index] = 'playing';
            this.preLoaded[index].className = 'media-item';
        } else return;
    }
    pause(index: number) {
        if (this.preLoaded[index] && this.preLoadDone[index]) {
            this.preLoaded[index].pause();
            this.status[index] = 'pause';
        } else return
    }
    withPlayer(index: number, cb: (player: HTMLAudioElement | HTMLVideoElement) => void) {
        if (this.preLoaded[index] && this.preLoadDone[index]) {
            cb(this.preLoaded[index]);
        }
    }
    change() {
        let media = this.mediaList.top();
        if (media) {
            let index = media.index;
            if (index == this.current) {
                return
            }
            this.lstRep = -1;
            const keys = Object.keys(this.preLoaded);
            keys.forEach(key => {
                const idx = parseInt(key);
                if (index > idx) {
                    if (this.preLoaded[idx]) {
                        try {
                            this.preLoaded[idx].src = "";
                            this.preLoaded[idx].pause();
                        } catch (ignore) { };
                        this.ctr.removeChild(this.preLoaded[idx]);
                        delete this.status[idx];
                        delete this.preLoaded[idx];
                        delete this.preLoadDone[idx];
                    }
                }
            })
            this.current = index;
            if (this.preLoaded[index] && this.preLoadDone[index]) {
                this.events.emit('ready', { index: index });
            } else if (!this.preLoaded[index]) {
                this.preLoad(media);
            }
            this.checkPreLoad();
        } else {
            Object.keys(this.preLoaded).forEach(key => {
                this.ctr.removeChild(this.preLoaded[key]);
                delete this.preLoaded[key];
                delete this.preLoadDone[key];
            })
            this.current = -1
        }
    }
    getStatus(index: number) {
        return this.status[index];
    }
    checkPreLoad() {
        if (this.mediaList.next())
            this.preLoad(this.mediaList.next());
    }
    preLoad(media: Media) {
        if (this.preLoaded[media.index]) return;
        if (media.type == MEDIA_TYPE.AUDIO) {
            this.preLoaded[media.index] = new Audio(media.url);
        } else if (media.type == MEDIA_TYPE.VIDEO) {
            this.preLoaded[media.index] = document.createElement('video');
            this.preLoaded[media.index].src = media.url;
        }
        this.status[media.index] = 'loading';
        this.preLoaded[media.index].controls = true;
        this.preLoaded[media.index].preload = 'auto';
        this.preLoaded[media.index].className = 'media-item media-preload';
        this.ctr.appendChild(this.preLoaded[media.index]);
        this.preLoaded[media.index].addEventListener('error', (e) => {
            if (this.preLoaded[media.index])
                this.events.emit('error', { index: media.index });
        })
        this.preLoaded[media.index].addEventListener('canplay', () => {
            this.preLoadDone[media.index] = true;
            if (this.current == media.index) {
                if (this.status[media.index] == 'loading')
                    this.events.emit('ready', { index: media.index });
            }
            this.status[media.index] = 'waiting';
            console.log(`ID#${media.index} loaded`)
        })
        this.preLoaded[media.index].addEventListener('pause', () => {
            this.status[media.index] = 'pause';
        })
        this.preLoaded[media.index].addEventListener('play', () => {
            this.status[media.index] = 'playing';
        })
        this.preLoaded[media.index].addEventListener('timeupdate', () => {
            this.sendRep();
        })
        this.preLoaded[media.index].addEventListener('ended', () => {
            this.events.emit('finish', { index: media.index });
        })
        this.preLoadDone[media.index] = false;
    }
    setVolume(value: number) {
        value = value / 100;
        if (this.preLoaded[this.current]) {
            this.preLoaded[this.current].volume = value;
        }
        this.volume = value
    }
}