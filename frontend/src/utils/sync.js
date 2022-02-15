import { baseURL } from "@/utils/constants";
import store from "@/store";

const ssl = window.location.protocol === "https:";
const protocol = ssl ? "wss:" : "ws:";

const eventPlay = 1;
const eventPause = 2;
const eventSeeked = 3;
const eventJoin = 4;

export class SyncPlayer {
    constructor(player) {
        this.player = player;
        this.currentTime = 0;
        this.userId = store.state.user.id;

        let url = `${protocol}//${window.location.host}${baseURL}/api/sync_video?auth=${store.state.jwt}`;
        console.log(this.userId, url);
        this.conn = new window.WebSocket(url);
        this.conn.onopen = this.connOpen;
        this.conn.onerror = this.connError;
        this.conn.onmessage = this.connMessage;
        this.conn.onclose = this.connClose;

        this.startListener();
    }

    log(msg) {
        console.log(this.player.currentTime, "---", msg);
    }
    connOpen = () => {
        this.log("ws connected");
        this.sendEvent(eventJoin);
    }
    connError = () => {
        this.log("ws error");
    }
    connClose = () => {
        this.log("ws closed");
        if (this.player) {
            this.player.pasue();
        }
    }
    connMessage = (msg) => {
        this.log(msg.data);
        let event = JSON.parse(msg.data);
        if (event.uid === this.userId) {
            return;
        }
        if (!this.player) {
            return;
        }
        switch (event.e) {
            case eventPlay:
                this.player.play();
                break;
            case eventPause:
                this.player.pause();
                break;
            case eventSeeked:
                this.player.currentTime = event.ct;
                break;
            case eventJoin:
                this.sendEvent(eventSeeked);
                break
        }
    }

    sendEvent(event) {
        if (this.conn.readyState !== 1) {
            console.log("conn no ready");
            return;
        }
        let msg = JSON.stringify({ "uid": this.userId, "e": event, "ct": this.player.currentTime, "ts": new Date().getTime() });
        this.conn.send(msg);
        this.log(msg);
    }

    startListener() {
        this.player.addEventListener("canplay", () => {
            this.log("canplay");
        });
        this.player.addEventListener("play", (e) => {
            this.log("play");
            console.log(e);
            this.sendEvent(eventPlay);
        });
        this.player.addEventListener("ended", () => {
            this.log("ended");
        });
        this.player.addEventListener("pause", () => {
            this.log("pause");
            this.sendEvent(eventPause);
        });
        this.player.addEventListener("seeking", () => {
            this.log("seeking");
        });
        this.player.addEventListener("seeked", () => {
            this.log("seeked");
            this.sendEvent(eventSeeked);
        });
        this.player.addEventListener("waiting", () => {
            this.log("waiting");
        });
        // this.player.addEventListener("timeupdate", () => {
        //     this.log("timeupdate");
        // });
    }

    dispose() {
        this.player = null;
        this.conn.close();
    }
}

// 暂停状态下: seeking seeked canplay
// 播放状态下: pause seeking seeked canplay play
// 播放 play
// 暂停 pause


// 播放 onplay onplaying ontimeupdate
// 暂停 onpause
// 暂停状态下: ontimeupdate onseeked
// 播放状态下: onpause onplay ontimeupdate onseeked onplaying ontimeupdate

