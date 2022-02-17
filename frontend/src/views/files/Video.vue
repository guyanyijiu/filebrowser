<template>
  <video
    webkit-playsinline
    playsinline
    ref="videojsPlayer"
    id="videojs-player"
    class="video-js vjs-big-play-centered"
  ></video>
</template>

<script>
import videojs from "video.js";
import "video.js/dist/video-js.min.css";

export default {
  props: {
    src: {
      type: String,
      default: "",
    },
  },

  data() {
    return {
      player: null,
    };
  },

  computed: {
    localProgressKey() {
      return this.src.replace(/(t|k)=\d+/, ""); // 避免时间戳的干扰
    },
  },

  mounted() {
    const options = {
      controls: true,
      playbackRates: [0.1, 0.5, 1.0, 1.2, 1.5, 2.0], // 可选的播放速度
      autoplay: false, // 如果为true,浏览器准备好时开始播放
      muted: false, // 默认情况下将会消除任何音频
      loop: false, // 是否视频一结束就重新开始
      preload: "auto", // 建议浏览器在<video>加载元素后是否应该开始下载视频数据。auto浏览器选择最佳行为,立即开始加载视频（如果浏览器支持）
      language: "zh-CN",
      fill: true, // 填充模式
      sources: [
        {
          src: this.src,
        },
      ],
      notSupportedMessage: "此视频暂无法播放, 请稍后再试", // 允许覆盖Video.js无法播放媒体源时显示的默认信息
      controlBar: {
        currentTimeDisplay: true, // 显示当前时间
        timeDivider: true, // 当前时间和持续时间的分隔符
        durationDisplay: true, // 显示持续时间
        remainingTimeDisplay: false, // 是否显示剩余时间功能
        fullscreenToggle: true, // 是否显示全屏按钮
        children: [
          {
            name: "playToggle",
          },
          {
            name: "progressControl",
          },
          {
            name: "currentTimeDisplay",
          },
          {
            name: "timeDivider",
          },
          {
            name: "durationDisplay",
          },
          {
            name: "playbackRateMenuButton",
          },
          {
            name: "volumePanel", // 音量调整方式横线条变为竖线条
            inline: false,
          },
          {
            name: "pictureInPictureToggle",
          },
          {
            name: "fullscreenToggle",
          },
        ],
      },
      userActions: {
        hotkeys: function (event) {
          // `this` is the player in this context
          // `空格` key = pause
          if (event.which === 32) {
            // 获取视频播放状态，如果是暂停，按空格键进行播放，否则暂停
            if (this.techGet_("paused")) {
              this.play();
            } else {
              this.pause();
            }
          }
          if (event.which === 37) {
            // 后退
            this.techCall_(
              "setCurrentTime",
              this.techGet_("currentTime") > 5
                ? this.techGet_("currentTime") - 5
                : 0
            );
          }
          if (event.which === 39) {
            // 前进
            this.techCall_(
              "setCurrentTime",
              this.techGet_("currentTime") < this.techGet_("duration")
                ? this.techGet_("currentTime") + 5
                : this.techGet_("duration")
            );
          }
        },
      },
    };

    this.player = videojs(this.$refs.videojsPlayer, options, () => {
      console.log("videojs ready.");
    });

    // 记录播放进度
    this.player.on("play", () => {
      const ct = this.player.currentTime();
      if (ct > 0) {
        return;
      }
      const t = this.getLocalProgress();
      if (t > 0) {
        this.player.currentTime(t);
      }
    });
    this.player.on("timeupdate", () => {
      this.setLocalProgress(this.player.currentTime());
    });
  },

  beforeDestroy() {
    if (this.player) {
      this.player.dispose();
    }
  },

  methods: {
    getLocalProgress() {
      const t = localStorage.getItem(this.localProgressKey) || 0;
      return Math.max(t - 1, 0);
    },
    setLocalProgress(t) {
      localStorage.setItem(this.localProgressKey, t);
    },
  },
};
</script>

<style>
.video-js .vjs-time-control {
  display: block;
  padding-left: 0em;
  padding-right: 0em;
}
</style>