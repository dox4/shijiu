import * as path from "path"
import * as fs from "fs"
import axios from "axios"
import {
    ASSERTS_DIR,
    CACHE_DIR,
    cacheExpired,
    DOCS_DIR,
    HALF_DAY,
    INDEX_FILE,
    LOGGER,
    readDirRecursive,
    readFileContent,
    SCRIPT_DIR,
} from "./common.js"
import { FontCache, makeFont } from "./font.js"

const TITLE_KEY = "title"
const SOURCE_KEY = "source"
const SCRIPT_KEY = "script"
const TYPE_KEY = "type"

function proxyConfig() {
    const proxyUrl = process.env.HTTPS_PROXY || ""
    LOGGER.info(`HTTPS_PROXY: ${process.env.HTTPS_PROXY}`)

    return proxyUrl
        ? {
              proxy: {
                  protocol: proxyUrl.split(":")[0],
                  host: proxyUrl.split("//")[1].split(":")[0],
                  port: proxyUrl.split(":")[2],
              },
          }
        : null
}

class TextCache {
    constructor(fileName, source) {
        this.fileName = fileName
        this.source = source
        this.cacheFile = path.join(CACHE_DIR, fileName)
    }

    shouldUpdate() {
        return cacheExpired(this.cacheFile, HALF_DAY)
    }

    async updateCache() {
        const proxy = proxyConfig()
        const response = await axios.get(this.source, proxy)
        if (response.status != 200) {
            LOGGER.error(response)
            throw new Error(`fetch data from ${this.source} failed`)
        }
        const data = response.data
        LOGGER.info(`fetch data from ${this.source}`)
        fs.writeFile(this.cacheFile, data, "utf8", () => LOGGER.info("write cache file: " + this.fileName))
    }
}

class Section {
    constructor(data) {
        this.title = data[TITLE_KEY]
        this.source = data[SOURCE_KEY]
        this.script = data[SCRIPT_KEY]
        this.type = data[TYPE_KEY]
    }

    async findOrCreateCache() {
        const fileName = `${this.title}.${this.type}`
        const cache = new TextCache(fileName, this.source)
        if (cache.shouldUpdate()) {
            await cache.updateCache()
        }
    }

    async process() {
        const scriptPath = path.resolve(SCRIPT_DIR, this.script)
        const protocolPrefix = "file://"
        const dym = await import(protocolPrefix + scriptPath)
        return await dym.process(this)
    }
}

async function updateDocs() {
    // make text data
    const data = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"))
    const sections = data.map((data) => new Section(data))
    const sidebar = []
    for (const section of sections) {
        await section.findOrCreateCache()
        const navigation = await section.process()
        sidebar.push(navigation)
    }
    const sidebarPath = path.resolve(DOCS_DIR, ".vitepress", "sidebar.ts")
    fs.writeFile(sidebarPath, `export const sidebar = ${JSON.stringify(sidebar)}`, "utf8", () => {})
}
async function updateFont() {
    // update font cache
    const fontCache = new FontCache("lxgw", "LxgwWenkaiTC", "LXGWWenKaiTC-Regular.ttf", ASSERTS_DIR)
    await fontCache.fetchLatestFontInfo()
    await fontCache.updateFontCacheWhenExpired()
    // create new font for the text
    const dirs = readDirRecursive(DOCS_DIR)
    const content = readFileContent(dirs)
    const text = [...new Set(content)].join("")
    makeFont(text, fontCache.originalTTF(), ASSERTS_DIR)
}

await updateDocs()
await updateFont()
