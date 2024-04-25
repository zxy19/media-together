import { sec2string } from "./miscUtil";
import { MEDIA_TYPE } from "../types/media-item";
import { MediaListManager } from "./mediaListUtil";
import { PlayController } from "./player";

export class StatusDrawer {
    private canvasElement: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private mediaList: MediaListManager;
    private playerController: PlayController;
    private videoElement: HTMLVideoElement;
    stream: MediaStream;
    lastTracks: MediaStreamTrack[] = [];
    lastType: string = "";
    enabled = false;
    lastPIP = -2;
    needRefreshCanvas = true;
    intervalId: any = 0;
    lastRenderTime = 0;
    constructor(mediaList: MediaListManager, playerController: PlayController) {
        document.body.appendChild(this.canvasElement = document.createElement('canvas'));
        this.canvasElement.style.display = 'none';
        this.ctx = this.canvasElement.getContext('2d');
        this.mediaList = mediaList;
        this.playerController = playerController;
        this.canvasElement.width = 640;
        this.canvasElement.height = 390;

        this.intervalId = 0;
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.className = 'video-fb';
        document.body.appendChild(this.videoElement);
        setInterval(this.drawIfNotRender.bind(this), 2000);
        this.lastRenderTime = Date.now();
    }
    drawIfNotRender() {
        if(!this.enabled)
            return;
        if (Date.now() - this.lastRenderTime > 1000 && this.needRefreshCanvas) {
            this.drawCanvas();
        }
    }
    async draw() {
        if (!this.enabled) return;
        this.needRefreshCanvas = false;
        let pip = -1;
        if (this.mediaList.top()) {
            if (this.mediaList.top().type == MEDIA_TYPE.VIDEO) {
                pip = this.mediaList.top().index;
            }
        }

        if (pip != this.lastPIP) {
            if (pip != -1) {
                try {
                    let pl: HTMLVideoElement;
                    this.playerController.withPlayer(this.mediaList.top().index, (player) => {
                        pl = player as HTMLVideoElement;
                    });
                    await pl.requestPictureInPicture();
                    this.lastPIP = pip;
                } catch (e) {
                    this.needRefreshCanvas = true;
                    if (this.lastPIP != -1) {
                        try {
                            await this.videoElement.requestPictureInPicture();
                            this.lastPIP = -1;
                        } catch (ignore) { }
                    }
                }
            } else {
                try {
                    await this.videoElement.requestPictureInPicture();
                    this.lastPIP = -1;
                } catch (ignore) { }
                this.needRefreshCanvas = true;
            }
        } else {
            if (this.lastPIP == -1)
                this.needRefreshCanvas = true;
        }
    }
    protected refreshCanvas() {
        if(!this.enabled)
            return;
        this.drawCanvas();
        window.requestAnimationFrame(this.refreshCanvas.bind(this));
    }
    protected drawCanvas() {
        if (!this.enabled)
            return;
        this.lastRenderTime = Date.now();
        this.ctx.fillStyle = '#e1f5fe';
        this.ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        if (!this.needRefreshCanvas) {
            return;
        }
        //标题
        this.ctx.fillStyle = '#006064';
        this.ctx.roundRect(0, 0, this.canvasElement.width, 50, 200);
        this.ctx.fill();
        if (this.mediaList.top()) {

            this.ctx.fillStyle = '#e0f2f1';
            this.ctx.font = '40px 黑体';
            this.ctx.fillText("正在播放：" + this.mediaList.top().name, 10, 40);

            //进度条-时间
            let duration: number, current: number;
            this.playerController.withPlayer(this.mediaList.top().index, (player) => {
                duration = player.duration;
                current = player.currentTime;
            });
            this.ctx.fillStyle = '#546e7a';
            this.ctx.font = '20px 黑体';
            if (duration === Infinity) {
                this.ctx.fillText("流媒体", 400, 85);
            } else if (duration) {
                this.ctx.fillText(sec2string(current) + "/" + sec2string(duration), 420, 85);
            } else {
                this.ctx.fillText("未知", 400, 85);
            }

            //进度条-进度条本体
            this.ctx.fillStyle = "#795548";
            this.ctx.beginPath();
            this.ctx.roundRect(10, 70, 400, 15, 20);
            this.ctx.fill();

            //进度条-进度条
            if (duration && duration !== Infinity) {
                this.ctx.fillStyle = "#4caf50";
                this.ctx.beginPath();
                this.ctx.roundRect(10, 69, current / duration * 385 + 15, 17, 20);
                this.ctx.fill();
            }
            //用户信息
            this.ctx.fillStyle = "#455a64";
            this.ctx.font = '30px 黑体';
            this.ctx.fillText("来自 " + this.mediaList.top().from, 10, 120);

            if (this.mediaList.next()) {
                this.ctx.font = '20px 黑体';
                this.ctx.fillStyle = "#607d8b";
                this.ctx.fillText("下一个", 10, 200);

                this.ctx.fillStyle = "#283593";
                this.ctx.beginPath();
                this.ctx.roundRect(10, 210, 15, 100, 15);
                this.ctx.fill();

                this.ctx.font = '40px 黑体';
                this.ctx.fillStyle = "#455a64";
                this.ctx.fillText(this.mediaList.next().name, 45, 255);

                this.ctx.font = '30px 黑体';
                this.ctx.fillText("来自 " + this.mediaList.next().from, 60, 285);
                if (this.mediaList.next().type == MEDIA_TYPE.VIDEO) {
                    this.ctx.font = '20px 黑体';
                    this.ctx.fillStyle = "#607d8b";
                    this.ctx.fillText("【下一个是视频媒体】", 100, 310);
                }
            } else {
                this.ctx.font = '20px 黑体';
                this.ctx.fillStyle = "#607d8b";
                this.ctx.fillText("没有下一个。将循环播放当前媒体", 10, 170);
            }
        } else {
            this.ctx.fillStyle = '#e0f2f1';
            this.ctx.font = '40px 黑体';
            this.ctx.fillText("没有正在播放的媒体", 10, 40);
        }
    }
    getMedia() {
        return this.stream;
    }
    enable() {
        this.enabled = true;
        this.refreshCanvas();
        this.intervalId = setInterval(this.draw.bind(this), 1000);
        this.stream = this.canvasElement.captureStream(30);
        this.videoElement.srcObject = this.stream;
    }
    disable() {
        this.enabled = false;
        document.exitPictureInPicture();
        clearInterval(this.intervalId);
        this.videoElement.srcObject = null;
        this.stream = null;
    }
}