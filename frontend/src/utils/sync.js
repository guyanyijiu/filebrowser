import { baseURL } from "@/utils/constants";
import store from "@/store";

const ssl = window.location.protocol === "https:";
const protocol = ssl ? "wss:" : "ws:";

const EventPlay = 1;
const EventDelayPlay = 2;
const EventPause = 3;
const EventSeekPlay = 4;
const EventSeekPause = 5;
const EventSyncOpen = 8;
const EventSyncClose = 9;

export class SyncPlayer {
  constructor() {
    this.player = null;
    this.userId = store.state.user.id;
    this.url = `${protocol}//${window.location.host}${baseURL}/api/sync_video?auth=${store.state.jwt}`;
    this.syncMode = false;
    this.playDelay = 0;
  }

  async start(player) {
    this.player = player;

    this.conn = new window.WebSocket(this.url);
    this.conn.onopen = this.connOpen;
    this.conn.onerror = this.connError;
    this.conn.onmessage = this.connMessage;
    this.conn.onclose = this.connClose;
  }

  connected() {
    return this.conn.readyState === 1;
  }

  makePlayToggleClickHook() {
    const that = this;
    return function (player) {
      console.log("syncMode", that.syncMode);
      if (!that.syncMode) {
        return true;
      }
      if (player.paused()) {
        that.sendEvent(EventPlay);
      } else {
        player.pause();
        that.sendEvent(EventPause);
        return false;
      }
      return false;
    };
  }

  wait(ts) {
    for (; ;) {
      if (new Date().getTime() >= ts) {
        return;
      }
    }
  }

  sendEventDelayPlay(event) {
    let now = new Date().getTime();
    let delay = 3 * (now - event.et);
    if (delay < this.playDelay) {
      delay = 2 * this.playDelay;
    }
    console.log("dt is: ", delay)
    const dt = delay + now;
    this.sendEvent(EventDelayPlay, dt);
    this.wait(dt - this.playDelay);
    console.log("play start", new Date().getTime(), this.playDelay);
    this.player.play();
  }

  connOpen = () => {
    console.log("sync player connected");
  };
  connError = () => {
    console.log("sync player conn error");
  };
  connClose = () => {
    console.log("sync player conn closed");
    if (this.player) {
      this.player.pause();
    }
  };

  connMessage = async (msg) => {
    console.log("<---", msg.data);

    let event = JSON.parse(msg.data);
    if (event.uid === this.userId) {
      return;
    }

    if (!this.player) {
      return;
    }

    switch (event.e) {
      case EventPlay:
        if (this.player.paused()) {
          if (event.vt === 0) {
            if (this.player.currentTime() === 0) {
              this.sendEventDelayPlay(event);
            } else {
              this.sendEvent(EventSeekPause);
            }
          } else {
            this.player.currentTime(event.vt);
            this.sendEventDelayPlay(event);
          }
        } else {
          if (event.vt === 0) {
            this.sendEvent(EventSeekPlay);
          } else {
            this.player.pause();
            this.player.currentTime(event.vt);
            this.sendEventDelayPlay(event);
          }
        }
        break;
      case EventDelayPlay: {
        this.wait(event.dt - this.playDelay);
        const start = new Date().getTime();
        console.log("play start", start);
        this.player.play();
        const delay = new Date().getTime() - start;
        console.log("play delay", delay);
        this.playDelay = delay;
        break;
      }
      case EventPause:
        if (!this.player.paused()) {
          this.player.pause();
          this.player.currentTime(event.vt);
        }
        break;
      case EventSeekPause:
        this.player.currentTime(event.vt);
        break;
      case EventSeekPlay:
        this.player.currentTime(new Date().getTime() - event.et + event.vt);
        this.player.play();
        break;
      case EventSyncOpen:
        this.syncMode = true;
        break;
      case EventSyncClose:
        this.syncMode = false;
        break;
    }
  };

  sendEvent(event, dt = 0) {
    if (!this.player) {
      return;
    }

    if (!this.syncMode || !this.connected()) {
      console.log("sync player cant send event");
      return;
    }

    let msg = JSON.stringify({ "uid": this.userId, "e": event, "vt": this.player.currentTime(), "et": new Date().getTime(), "dt": dt });
    this.conn.send(msg);
    console.log("--->", msg);
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
