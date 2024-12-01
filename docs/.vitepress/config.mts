import { defineConfig } from "vitepress"
import { sidebar } from "./sidebar"

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "十九",
    description: "",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            { text: "Home", link: "/" },
            { text: "古诗十九首", link: "/古诗十九首" },
        ],

        sidebar: sidebar,
        socialLinks: [{ icon: "github", link: "https://github.com/vuejs/vitepress" }],
    },
})
