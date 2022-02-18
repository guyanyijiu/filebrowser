import { baseURL } from "@/utils/constants";
import store from "@/store";

const ssl = window.location.protocol === "https:";
const protocol = ssl ? "wss:" : "ws:";

const EventPlay        = 1;
const EventPause       = 2;
const EventSeeked      = 3;
const EventJoin        = 4;
// const EventUserOffline = 9;

export class SyncPlayer {
    constructor(player) {
        this.player = player;

        this.userId = store.state.user.id;

        let url = `${protocol}//${window.location.host}${baseURL}/api/sync_video?auth=${store.state.jwt}`;
        console.log(this.userId, url);
        this.conn = new window.WebSocket(url);
        this.conn.onopen = this.connOpen;
        this.conn.onerror = this.connError;
        this.conn.onmessage = this.connMessage;
        this.conn.onclose = this.connClose;
    }

    connected() {
        return this.conn.readyState === 1
    }

    log(msg) {
        console.log(this.player.currentTime, "---", msg);
    }
    connOpen = () => {
        this.log("sync player connected");
        this.sendEvent(EventJoin);
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
            case EventPlay:
                this.player.play();
                break;
            case EventPause:
                this.player.pause();
                break;
            case EventSeeked:
                this.player.currentTime(event.vt);
                break;
            case EventJoin:
                this.sendEvent(EventSeeked);
                break
        }
    }

    sendEvent(event) {
        if (!this.connected()) {
            console.log("conn no ready");
            return;
        }
        let msg = JSON.stringify({ "uid": this.userId, "e": event, "vt": this.player.currentTime(), "et": new Date().getTime() });
        this.conn.send(msg);
        this.log(msg);
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

