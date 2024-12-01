import * as path from "path"
import * as fs from "fs"
import axios from "axios"
import { CACHE_DIR, DOCS_DIR, INDEX_FILE, SCRIPT_DIR } from "./common.js"

const TITLE_KEY = "title"
const SOURCE_KEY = "source"
const SCRIPT_KEY = "script"
const TYPE_KEY = "type"

const HALF_DAY = 1000 * 60 * 60 * 12

function proxyConfig() {
    const proxyUrl = process.env.HTTPS_PROXY
    console.debug(`HTTPS_PROXY: ${process.env.HTTPS_PROXY}`)

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

class Cache {
    constructor(fileName, source) {
        this.fileName = fileName
        this.source = source
        this.cacheFile = path.join(CACHE_DIR, fileName)
    }

    shouldUpdate() {
        return (
            !fs.existsSync(this.cacheFile) ||
            new Date().getTime() - fs.statSync(this.cacheFile).mtime.getTime() > HALF_DAY
        )
    }

    async updateCache() {
        const proxy = proxyConfig()
        const response = await axios.get(this.source, proxy)
        if (response.status != 200) {
            console.error(response)
            throw new Error(`fetch data from ${this.source} failed`)
        }
        const data = response.data
        console.log(`fetch data from ${this.source}`)
        console.log(data)
        fs.writeFile(this.cacheFile, data, "utf8", () => console.log("write cache file: " + this.fileName))
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
        const cache = new Cache(fileName, this.source)
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

async function main() {
    const data = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"))
    const sections = data.map((data) => new Section(data))
    const sidebar = []
    for (const section of sections) {
        await section.findOrCreateCache()
        const naviagtion = await section.process()
        sidebar.push(naviagtion)
    }
    const sidebarPath = path.resolve(DOCS_DIR, ".vitepress", "sidebar.ts")
    fs.writeFile(sidebarPath, `export const sidebar = ${JSON.stringify(sidebar)}`, "utf8", () => {})
}

await main()
