import { Events } from "./utils/events";
import "./style/main.css";
import "./style/media-list.css";
import "./style/msg.css";
import { Room, RoomWithWorker } from "./utils/network";
import { MediaListManager, HistoryListManager } from "./utils/mediaListUtil";
import { StatusDrawer } from "./utils/statusDrawer";
import { PlayController } from "./utils/player";
import { v4 as uuidV4 } from 'uuid';
import { cloud } from "./config/net";
import { UserList } from "./utils/userList";
import { msgManager } from "./utils/msgBox";
import { MSG_TYPE } from "./types/msg";
var events = new Events<{ type: string, from: string, [key: string]: any }>();
var userID = localStorage['userId'] ?? uuidV4();
(document.getElementById("roomId") as HTMLInputElement).value = localStorage['roomId'] ?? "";
(document.getElementById("userName") as HTMLInputElement).value = localStorage['userName'] ?? "";
var room;
document.getElementById("login").addEventListener("click", () => {
    let roomId = parseInt((document.getElementById("roomId") as HTMLInputElement).value);
    let userName = (document.getElementById("userName") as HTMLInputElement).value;
    localStorage['roomId'] = roomId;
    localStorage['userName'] = userName;

    room = new RoomWithWorker(roomId, userID, userName, (data) => {
        events.emit(data.type, data as any);
    })
    document.getElementById("login").setAttribute("disabled", "true");
    document.getElementById("login").innerHTML = "登录中...";
})

var sw: ServiceWorkerRegistration | null;
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            sw = registration;
            console.log('SW registered');
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (confirm("服务工作者需要更新，现在请求刷新页面，是否同意？如果您有未完成的作业，可以取消并稍后手动刷新")) {
            window.location.reload();
        }
    });
}


var historyList = new HistoryListManager(document.getElementById("history-list") as HTMLDivElement, events);
var mediaList = new MediaListManager(document.getElementById("media-list") as HTMLDivElement, events, historyList);
var playController = new PlayController(document.getElementById("media-container") as HTMLDivElement, mediaList, events);
var userList = new UserList(document.getElementById("user-list") as HTMLDivElement, userID);
var statusDrawer = new StatusDrawer(mediaList, playController);
var msg = new msgManager(document.getElementById("msg-box") as HTMLDivElement);
var firstPlay = -1;
var firstTime = -1;
events.on("msg", (data) => {
    msg.addMsg(data.from, data.msg, data.theme ?? MSG_TYPE.INFO);
})
events.on("changeIndex", (data) => {
    mediaList.change(data.index as number);
    playController.change();
})
events.on("pause", (data) => {
    playController.pause(data.index as number);
    console.log("[播放器] 暂停播放Index" + data.index);
})
events.on("play", (data) => {
    playController.play(data.index as number);
    console.log("[播放器] 开始播放Index" + data.index);
})
events.on("slow", (data) => {
    console.log("[播放器] 变速同步中");
    playController.withPlayer(data.index as number, (player) => {
        player.playbackRate = data.slower ? 0.99 : 1;
    });
})
events.on("ready", (data) => {
    events.emit("msg", { type: "msg", from: "播放器", msg: "客户端媒体加载完成", theme: MSG_TYPE.INFO });
    if (firstPlay != -1 && data.index == firstPlay) {
        playController.play(data.index);
        playController.withPlayer(data.index, (player) => {
            console.log("[播放器] 第一次播放Index" + data.index + ", 播放时间:" + firstTime);
            player.currentTime = firstTime / 1000;
        });
        firstPlay = -1;
    } else
        room.send({ type: "ready", index: data.index });
});
events.on("error", ({ index }) => {
    events.emit("msg", { type: "msg", from: "播放器", msg: "客户端媒体加载失败", theme: MSG_TYPE.WARNING });
    room.send({ type: "error", index: index });
})

events.on("initItems", (data) => {
    events.emit("msg", { type: "msg", from: "系统", msg: "成功加入房间", theme: MSG_TYPE.SUCCESS });
    if (data.history)
        data.history.forEach((media) => {
            historyList.addItem(media);
        })
    data.medias.forEach((media) => {
        mediaList.addItem(media);
    })
    playController.change();
    if (data.isPlaying) {
        firstPlay = data.index;
        firstTime = data.time;
    }
    document.getElementById("loginTip").style.display = "none";
})
events.on("addItem", (data) => {
    mediaList.addItem(data.media);
    playController.checkPreLoad();
})
events.on("addItems", (data) => {
    data.medias.forEach((media) => {
        mediaList.addItem(media);
    })
    playController.checkPreLoad();
})
events.on("updateItem", (data) => {
    mediaList.updateItem(data.media);
    playController.checkPreLoad();
})


events.on("addHistory", (data) => {
    historyList.addItem(data.media);
    playController.checkPreLoad();
})
events.on("pickHistory", (data) => {
    historyList.remove(data.index);
    playController.checkPreLoad();
})
events.on("removeHistory", (data) => {
    room.send({ type: "removeHistory", index: data.index });
})

events.on("finish", ({ index }) => {
    room.send({ type: "finish", index: index });
})
events.on("remove", ({ index }) => {
    room.send({ type: "remove", index: index });
})
events.on("resume", ({ index }) => {
    room.send({ type: "resume", index: index });
})
events.on("rep", ({ time }) => {
    room.send({ type: "rep", p: time });
})
events.on("seek", ({ time, index }) => {
    room.send({ type: "seek", p: time, index: index });
})
events.on("seekTo", ({ p, index }) => {
    playController.withPlayer(index, (player) => {
        player.currentTime = p / 1000;
    })
})
events.on("ping", ({ stamp }) => {
    room.send({ type: "pong", stamp: stamp });
})
events.on("status", (data) => {
    if (data.control == 2) {
        const status = playController.getStatus(data.index);
        if (status && status != "playing") {
            playController.play(data.index);
        }
    }
})


events.on("pull", ({ index }) => {
    room.send({ type: "pull", index: index });
})
events.on("pullHistory", ({ index }) => {
    room.send({ type: "pullHistory", index: index });
})
events.on("disconnected", () => {
    events.emit("msg", { type: "msg", from: "系统", msg: "与服务器断开连接", theme: MSG_TYPE.ERROR });
    mediaList.change(-1);
    historyList.change(-1);
    playController.change();
})
events.on("open", (data) => {
    events.emit("msg", { type: "msg", from: "系统", msg: "已连接到服务器", theme: MSG_TYPE.INFO });
})
events.on("users", (data) => {
    userList.updateUsers(data.data);
})

var onAddFormAdd = () => {
    let name = (<HTMLInputElement>document.getElementById("add-form-name")).value;
    let url = (<HTMLInputElement>document.getElementById("add-form-url")).value;
    let type = (<HTMLSelectElement>document.getElementById("add-form-type")).value;
    room.send({ type: "addItem", media: { name: name, url: url, type: type } });
}
document.getElementById("add").addEventListener("click", onAddFormAdd);

(document.getElementById("volume") as HTMLInputElement).value = localStorage['volume'] ?? "100";
(document.getElementById("volume") as HTMLInputElement).addEventListener("change", () => {
    localStorage['volume'] = (document.getElementById("volume") as HTMLInputElement).value;
    playController.setVolume(parseInt((document.getElementById("volume") as HTMLInputElement).value));
});
(document.getElementById("volume") as HTMLInputElement).addEventListener("input", () => {
    localStorage['volume'] = (document.getElementById("volume") as HTMLInputElement).value;
    playController.setVolume(parseInt((document.getElementById("volume") as HTMLInputElement).value));
})
playController.setVolume(parseInt(localStorage['volume'] ?? "100"));

let floatWindowBool = false;
(document.getElementById("floatWindow") as HTMLInputElement).addEventListener("click", () => {
    floatWindowBool = !floatWindowBool;
    if (floatWindowBool) {
        (document.getElementById("floatWindow") as HTMLInputElement).innerHTML = "退出浮窗";
        statusDrawer.enable();
    } else {
        (document.getElementById("floatWindow") as HTMLInputElement).innerHTML = "启动浮窗";
        statusDrawer.disable();
    }
})
document.getElementById("uploadFile").addEventListener("click", () => {
    document.getElementById("file").click();
})

document.getElementById("skipCurrent").addEventListener("click", () => {
    if (mediaList.top())
        room.send({ type: "finish", index: mediaList.top().index });
})
var toolWindow: Window = null;
var windowEvents = new Events<{ type: string, [key: string]: any }>();
document.getElementById("tools").addEventListener("click", () => {
    toolWindow = window.open("https://mt.xypp.cc/tools/index.html", "_blank", "height=300,width=400");
})

window.addEventListener("message", (event) => {
    let data = event.data;
    windowEvents.emit(data.type, data);
})

windowEvents.on("setForm", (data) => {
    (document.getElementById("add-form-name") as HTMLInputElement).value = data.name;
    (document.getElementById("add-form-url") as HTMLInputElement).value = data.url;
    (document.getElementById("add-form-type") as HTMLInputElement).value = data.mediaType;
})
windowEvents.on("submit", (data) => {
    onAddFormAdd();
})
windowEvents.on("close", (data) => {
    if (toolWindow) {
        toolWindow.close();
    }
})


document.getElementById("file").onchange = () => {
    document.getElementById("uploadFile").innerHTML = "正在上传";
    document.getElementById("uploadFile").setAttribute("disabled", "disabled");
    document.getElementById("add-form").classList.add("disabled");
    let file = (<HTMLInputElement>document.getElementById("file")).files[0];
    if (file) {
        const form = new FormData();
        form.append("file", file);

        let request = new XMLHttpRequest();
        request.open('POST', cloud, true);
        request.upload.addEventListener('progress', function (e) {
            document.getElementById("uploadFile").innerHTML = `上传中[${((e.loaded / e.total) * 100).toFixed(0)}%]`;
        });

        request.addEventListener('load', function (e) {
            let url = request.responseText;
            if (url.startsWith("https://") || url.startsWith("http://")) {
                (<HTMLInputElement>document.getElementById("add-form-url")).value = url;
                (<HTMLInputElement>document.getElementById("add-form-name")).value = file.name.split('.')[0];
                if (file.name.split('.')[1] === "mp3" || file.name.split('.')[1] === "flac" || file.name.split('.')[1] === "wav") {
                    (<HTMLInputElement>document.getElementById("add-form-type")).value = "audio";
                }
            } else {
                alert(url);
            }
            document.getElementById("uploadFile").removeAttribute("disabled");
            document.getElementById("add-form").classList.remove("disabled");
            document.getElementById("uploadFile").innerHTML = "上传文件";
        });
        request.addEventListener('error', function (e) {
            document.getElementById("uploadFile").removeAttribute("disabled");
            document.getElementById("add-form").classList.remove("disabled");
        })
        request.send(form);
    }
}

(<HTMLSelectElement>document.getElementById("wideMode")).value = localStorage['wideMode'] ?? "right";
document.getElementById("wideMode").addEventListener("change", (e) => {
    localStorage['wideMode'] = (<HTMLSelectElement>document.getElementById("wideMode")).value;
    updateWideClass();
})
function updateWideClass() {
    const mode = (<HTMLSelectElement>document.getElementById("wideMode")).value;
    const app = (<HTMLDivElement>document.getElementsByClassName("app")[0]);
    if (mode === "right") {
        app.classList.remove("left");
        app.classList.add("wide-mode");
    } else if (mode === "left") {
        app.classList.add("left");
        app.classList.add("wide-mode");
    } else {
        app.classList.remove("left");
        app.classList.remove("wide-mode");
    }
}
updateWideClass()

document.getElementById("show-add-form").addEventListener("click", (e) => {
    document.getElementById("add-form").classList.toggle("show");
    document.getElementById("tool-bar").classList.toggle("open");
    if (document.getElementById("add-form").classList.contains("show")) {
        document.getElementById("show-add-form").innerHTML = "收起";
    } else {
        document.getElementById("show-add-form").innerHTML = "点歌/获取媒体";
    }
})