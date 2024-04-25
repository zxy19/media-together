export function shortenUrl(url: string): string {
    if (url.length > 35) {
        return url.substring(0, 20) + ' ... ' + url.substring(url.length - 10);
    } else {
        return url;
    }
}
export function sec2string(sec: number): string {
    let tails = sec - Math.floor(sec);
    sec = Math.floor(sec);
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}.${Math.floor(tails*1000).toString().padStart(3, '0')}`;
}