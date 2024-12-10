import { CACHE_DIR, WEEK, LOGGER, cacheExpired } from "./common.js"
import Fontmin from "fontmin"
import { execSync } from "child_process"
import rename from "gulp-rename"
import path from "path"

export class FontCache {
    constructor(repoOwner, repoName, ttf) {
        this.repoOwner = repoOwner
        this.repoName = repoName
        this.ttf = ttf
    }

    async fetchLatestFontInfo() {
        const fetchUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`
        const releaseResponse = await fetch(fetchUrl)
        const releaseData = await releaseResponse.json()
        const downloadUrl = releaseData.assets[0].browser_download_url
        this.downloadFile = path.basename(downloadUrl).trim()
        this.dirName = this.downloadFile.replace(".tar.gz", "")
        this.downloadUrl = downloadUrl
        LOGGER.info(`downloading ${downloadUrl} ...`)
    }

    async updateFontCacheWhenExpired() {
        const cacheTar = path.resolve(CACHE_DIR, this.downloadFile)
        LOGGER.info("cache file should be located at", cacheTar)

        if (cacheExpired(cacheTar, WEEK)) {
            LOGGER.info("font cache is expired, updating...")
            const downloadCommand = ["curl", "-L", "-o", cacheTar, this.downloadUrl].join(" ")
            LOGGER.info("executing:", downloadCommand)
            execSync(downloadCommand, { cwd: CACHE_DIR })
            const decompressCommand = ["tar", "xf", cacheTar, "-C", CACHE_DIR].join(" ")
            LOGGER.info("executing:", decompressCommand)
            execSync(decompressCommand, { cwd: CACHE_DIR })
        }
        LOGGER.info("font cache is up to date")
    }
    originalTTF() {
        return path.resolve(CACHE_DIR, this.dirName, this.ttf)
    }
}

export function makeFont(text, ttf, dest) {
    LOGGER.info("make font", ttf, "to", dest)
    new Fontmin()
        .use(
            Fontmin.glyph({
                text: text,
            }),
        )
        .use(rename("font.woff2"))
        .use(Fontmin.ttf2woff2())
        .src(ttf)
        .dest(dest)
        .run((err, files) => {
            if (err) {
                LOGGER.error("font creation failed", err)
                throw err
            }
            LOGGER.info(`${files.length} fonts created`, "of text length", text.length)
        })
}
