import { Events } from "@/utils/events";
import { MEDIA_TYPE_NAME } from "../config/const";
import { MEDIA_STATE, MEDIA_TYPE, Media } from "../types/media-item";
import { shortenUrl } from "../utils/miscUtil";
import { regFloating } from "../utils/floatingWordBox";

export class MediaListManager {
    list: Media[] = [];
    elementIndex: number[] = [];
    elements: HTMLDivElement[] = [];
    ctr: HTMLDivElement
    current: number;
    events: Events<any>;
    historyListManager?: HistoryListManager
    constructor(containerEl: HTMLDivElement, events: Events<any>, historyListManager?: HistoryListManager) {
        this.ctr = containerEl;
        this.current = -1;
        this.events = events;
        this.historyListManager = historyListManager
    }
    addItem(item: Media) {
        if (this.list.find(m => m.index == item.index)) {
            return;
        }
        this.list.push(item);

        let newDivEl = document.createElement('div');
        this.ctr.appendChild(newDivEl);
        this.elements.push(newDivEl);
        this.elementIndex.push(item.index);
        this.refreshElement(newDivEl, item);
    }
    updateItem(item: Media) {
        this.list = this.list.map((m, idx) => {
            if (m.index == item.index) {
                this.refreshElement(this.elements[idx], item);
                return item;
            }
            return m;
        });
    }
    change(index: number) {
        while (this.elementIndex.length > 0 && ((index == -1) || this.elementIndex[0] < index)) {
            this.ctr.removeChild(this.elements[0]);
            this.list.shift();
            this.elements.shift();
            this.elementIndex.shift();
        }
        this.refreshList();
    }
    remove(index: number) {
        for (let i = 0; i < this.elementIndex.length; i++) {
            if (this.elementIndex[i] == index) {
                this.ctr.removeChild(this.elements[i]);
                this.list.splice(i, 1);
                this.elements.splice(i, 1);
                this.elementIndex.splice(i, 1);
                break;
            }
        }
        this.refreshList();
    }
    top(): null | Media {
        return this.list[0] || null;
    }
    next(): null | Media {
        for (let i = 1; i < this.list.length; i++) {
            if (this.list[i].state != MEDIA_STATE.REMOVED) {
                return this.list[i];
            }
        }
        if (this.historyListManager && this.historyListManager.top()) {
            return this.historyListManager.top()
        }
        return null;
    }
    protected refreshList() {
        for (let i = 0; i < this.elements.length; i++) {
            this.refreshElement(this.elements[i], this.list[i]);
        }
    }
    protected refreshElement(element: HTMLDivElement, media: Media) {
        if (!element.classList.contains('list-item')) {
            //new Element:Init boxes
            element.className = 'list-item';
            element.innerHTML = `<div class="list-item-type"></div><div class="list-item-name"></div>
<div class="list-item-url"></div><div class="list-item-from"></div><div class="list-item-op"></div><div class="list-item-pull">插队</div>`;
            element.getElementsByClassName('list-item-op')[0].setAttribute('data-id', media.index.toString());
            element.getElementsByClassName('list-item-op')[0].addEventListener('click', this.elementOpsEvents.bind(this));
            element.getElementsByClassName('list-item-pull')[0].setAttribute('data-id', media.index.toString());
            element.getElementsByClassName('list-item-pull')[0].addEventListener('click', this.elementPullEvents.bind(this));

            regFloating(element.getElementsByClassName('list-item-name')[0] as HTMLDivElement);
        }
        switch (media.state) {
            case MEDIA_STATE.REMOVED:
                element.className = 'list-item removed'; break;
            case MEDIA_STATE.WAITING:
                element.className = 'list-item waiting'; break;
            case MEDIA_STATE.PLAYING:
                element.className = 'list-item playing'; break;
            default:
                element.className = 'list-item';
        }
        if (media.type == MEDIA_TYPE.AUDIO) {
            element.getElementsByClassName('list-item-type')[0].innerHTML = MEDIA_TYPE_NAME.audio;
        } else {
            element.getElementsByClassName('list-item-type')[0].innerHTML = MEDIA_TYPE_NAME.video;
        }
        element.getElementsByClassName('list-item-name')[0].innerHTML = media.name;
        element.getElementsByClassName('list-item-from')[0].innerHTML = media.from;
        element.getElementsByClassName('list-item-url')[0].innerHTML = shortenUrl(media.url);
        if (media.state == MEDIA_STATE.REMOVED) {
            element.getElementsByClassName('list-item-op')[0].innerHTML = '恢复';
        } else {
            element.getElementsByClassName('list-item-op')[0].innerHTML = '删除';
        }
    }
    elementPullEvents(event: MouseEvent) {
        let index: number = parseInt(((event.currentTarget as HTMLDivElement).getAttribute('data-id')))
        this.events.emit('pull', { index });
    }
    elementOpsEvents(event: MouseEvent) {
        let index: number = parseInt(((event.currentTarget as HTMLDivElement).getAttribute('data-id')))
        if (((event.currentTarget as HTMLDivElement).getAttribute('data-is-resume') ?? "true") != "true") {
            this.events.emit('resume', { index });
            ((event.currentTarget as HTMLDivElement).setAttribute('data-is-resume', 'true'));
        } else {
            this.events.emit('remove', { index });
            ((event.currentTarget as HTMLDivElement).setAttribute('data-is-resume', 'false'));
        }
    }
}

export class HistoryListManager extends MediaListManager {
    constructor(containerEl: HTMLDivElement, events: Events<any>) {
        super(containerEl, events, null);
    }
    elementOpsEvents(event: MouseEvent): void {
        let index: number = parseInt(((event.currentTarget as HTMLDivElement).getAttribute('data-id')))
        this.events.emit('removeHistory', { index });
    }
    elementPullEvents(event: MouseEvent): void {
        let index: number = parseInt(((event.currentTarget as HTMLDivElement).getAttribute('data-id')))
        this.events.emit('pullHistory', { index });
    }
}