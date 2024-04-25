export class UserList {
    users: {
        id: number,
        name: string,
        webId: string,
        progress?: number,
        ping?: number
    }[]
    userElement: Record<number, HTMLDivElement> = {};
    ctr: HTMLDivElement
    selfID: string
    constructor(containerEl: HTMLDivElement, selfID: string) {
        this.ctr = containerEl;
        this.users = [];
        this.selfID = selfID
    }

    updateUsers(user: { id: number, name: string, webId: string, progress?: number, ping?: number }[]) {
        this.users = this.users.filter((u) => {
            if (!user.find((u2) => u2.id === u.id)) {
                this.ctr.removeChild(this.userElement[u.id]);
                delete this.userElement[u.id];
                return false;
            }
            return true;
        })
        const self = user.find((u) => { return u.webId == this.selfID })
        user.forEach((u) => {
            if (!this.userElement[u.id]) {
                this.userElement[u.id] = document.createElement('div');
                this.userElement[u.id].className = 'user';
                this.ctr.appendChild(this.userElement[u.id]);
                this.users.push(u);
            }
            let prog = "";
            if (u.progress && self && self.progress) {
                let timeDif = (u.progress - self.progress) / 1000;
                if (u.webId == self.webId) {
                    prog = `(你)`
                } else if (u.progress > self.progress) {
                    prog = `(+${(timeDif).toFixed(2)}s)`
                } else {
                    prog = `(${(timeDif).toFixed(2)}s)`
                }
            }
            let ping = "";
            if (u.ping!==undefined) {
                ping = `(${u.ping}ms)`
            }
            this.userElement[u.id].textContent = `${u.name}${ping}${prog}`;
        })
    }
}