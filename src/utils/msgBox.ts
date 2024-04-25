import { MSG_TYPE } from "../types/msg";
const THEME_CLASS = {
    [MSG_TYPE.INFO]: 'msg-info',
    [MSG_TYPE.ERROR]: 'msg-error',
    [MSG_TYPE.WARNING]: 'msg-warning',
    [MSG_TYPE.SUCCESS]: 'msg-success',
    [MSG_TYPE.DEBUG]: 'msg-debug'
}
export class msgManager {
    protected ctr: HTMLDivElement
    protected msgs: {
        ctd: number,
        elem: HTMLDivElement
    }[] = []

    constructor(containerEl: HTMLDivElement) {
        this.ctr = containerEl;
        setInterval(this.checkCtd.bind(this), 500);
    }
    checkCtd() {
        for (let i = 0; i < this.msgs.length; i++) {
            this.msgs[i].ctd -= 1;
            if (this.msgs[i].ctd < 1) {
                this.msgs[i].elem.classList.add('msg-hide');
            }
            if (this.msgs[i].ctd < 0) {
                this.ctr.removeChild(this.msgs[i].elem);
                this.msgs.splice(i, 1);
            }
        }
    }
    addMsg(from: string, msg: string, theme: MSG_TYPE = MSG_TYPE.INFO) {
        for (let i = 0; i < this.msgs.length - 5; i++) {
            this.msgs[i].elem.classList.add('msg-hide');
            this.msgs[i].ctd = 0
        }
        let elem = document.createElement('div');
        elem.className = 'msg-item ' + THEME_CLASS[theme];
        let fromEl = document.createElement('span');
        fromEl.innerText = from;
        fromEl.className = 'msg-from';
        elem.appendChild(fromEl);
        let msgEl = document.createElement('span');
        msgEl.className = 'msg-body';
        msgEl.innerText = msg;
        elem.appendChild(msgEl);
        this.ctr.appendChild(elem);
        this.msgs.push({
            ctd: 12,
            elem: elem
        })
    }
}