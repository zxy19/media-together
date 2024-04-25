import {v4 as uuidV4} from 'uuid';
export function regFloating(element: HTMLDivElement) {
    if(!element || !element.parentNode || !element.parentNode.parentNode || !element.parentNode.parentNode.parentNode) {
        console.log("box is detached from dom");
        return;
    }
    let ow = 0;
    let tmpEl = document.createElement('div');
    tmpEl.innerHTML = element.innerHTML;
    tmpEl.style.width = "fit-content";
    tmpEl.style.overflow = "visible!important";
    tmpEl.id = uuidV4();
    element.innerHTML = "";
    element.appendChild(tmpEl);
    ow = tmpEl.offsetWidth;
    const time = Math.max(Math.floor(((ow - element.offsetWidth)/40)*1000),1000);
    tmpEl.style.transition = "transform "+((ow - element.offsetWidth)/40).toFixed(2)+"s linear";
    let isFr = false;
    const floatCtr = () => {
        isFr = !isFr;
        if (isFr) {
            tmpEl.style.transform = "translateX(-" + (ow - element.offsetWidth) + "px)";
        } else {
            tmpEl.style.transform = "translateX(0px)";
        }
        if (document.getElementById(tmpEl.id)) {
            setTimeout(floatCtr, time);
        } else {
            regFloating(element);
        }
    }
    setTimeout(floatCtr, 200);
}