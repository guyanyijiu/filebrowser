<template>
  <div class="dashboard">
    <header-bar id="header-bar" showMenu showLogo />

    <div id="iframe-container">
      <iframe
        src="/AriaNg/"
        frameborder="0"
        width="100%"
        id="iframe-ariang"
      ></iframe>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";

import HeaderBar from "@/components/header/HeaderBar";

export default {
  name: "ariang",
  components: {
    HeaderBar,
  },
  computed: {
    ...mapState(["user", "loading"]),
  },
  mounted() {
    const iframe = document.getElementById("iframe-ariang");
    const header = document.getElementById("header-bar");
    const deviceHeight = Number(document.documentElement.clientHeight);
    const headerHeight = Number(header.clientHeight);
    iframe.style.height = deviceHeight - headerHeight - headerHeight / 2 + "px";
  },
};
</script>
