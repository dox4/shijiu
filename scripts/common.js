import * as path from "path"
import handlebars from "handlebars"
import * as fs from "fs"
import Fontmin from "fontmin"
import { execSync } from "child_process"
import rename from "gulp-rename"
export const DOCS_DIR = path.resolve(".", "docs")
export const INDEX_DIR = path.resolve(".", "data")
export const INDEX_FILE = path.resolve(INDEX_DIR, "index.json")
export const CACHE_DIR = path.resolve(".", "cache")
export const SCRIPT_DIR = path.resolve(".", "scripts")
export const ASSERTS_DIR = path.resolve(DOCS_DIR, "assets")
export const HALF_DAY = 1000 * 60 * 60 * 12
export const WEEK = HALF_DAY * 2 * 7
export const { compile } = handlebars

function now() {
    const date = new Date()
    const patch0 = (n) => (n < 10 ? "0" + n : n)
    const y = date.getFullYear()
    const m = patch0(date.getMonth() + 1)
    const d = patch0(date.getDate())
    const hours = patch0(date.getHours())
    const minutes = patch0(date.getMinutes())
    const seconds = patch0(date.getSeconds())
    const miliseconds = patch0(date.getMilliseconds())
    return `${y}-${m}-${d} ${hours}:${minutes}:${seconds}.${miliseconds}`
}
export const LOGGER = {
    info: (...args) => {
        console.log(now(), "INFO |", ...args)
    },
    error: (...args) => {
        console.error(now(), "ERROR |", ...args)
    },
}

const FONT = {
    REPO_OWNER: "lxgw",
    REPO_NAME: "LxgwWenKaiTC",
    FONT_STYLE: "Regular",
    CACHE_TAR_FILE: "",
    VERSION_DIR: "",
}

export class Poetry {
    constructor(title, comment, lines) {
        this.title = title
        this.comment = comment
        this.lines = lines
    }

    render(parent) {
        const target = docPathOf(parent, this.title + ".md")
        const templatePaht = path.resolve(INDEX_DIR, "page.md.hbs")
        render(this, templatePaht, target)
        return {
            text: this.title,
            link: `/${parent}/${this.title}`,
        }
    }
}

export class Line {
    constructor(line, note) {
        this.line = line
        this.note = note
    }
}
function render(ctx, templatePath, target) {
    const tpl = fs.readFileSync(templatePath)
    const content = compile(tpl.toString())(ctx)
    const dirName = path.dirname(target)
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true })
    }
    fs.writeFile(target, content, "utf8", () => {})
}

export function renderIndex(ctx, target) {
    const templatePaht = path.resolve(INDEX_DIR, "poetryIndex.md.hbs")
    render(ctx, templatePaht, target)
}

export function chineseNumber(num) {
    const numberToChinese = {
        0: "零",
        1: "一",
        2: "二",
        3: "三",
        4: "四",
        5: "五",
        6: "六",
        7: "七",
        8: "八",
        9: "九",
    }
    if (num < 10) {
        return numberToChinese[num]
    }
    let numStr = num.toString()
    let target = ""
    if (numStr.length === 2) {
        let tens = parseInt(numStr[0])
        let units = parseInt(numStr[1])
        if (tens > 0) {
            target = "十"
            if (tens > 1) {
                target = numberToChinese[tens] + "十"
            }
        }
        if (units > 0) {
            if (tens > 0) {
                target += numberToChinese[units]
            } else {
                target = numberToChinese[units]
            }
        }
    }
    return target
}
export function docPathOf(section, file) {
    return path.join(DOCS_DIR, section, file || "index.md")
}

async function updateFontVersionDir(owner, repo) {
    const releaseResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`)
    const releaseData = await releaseResponse.json()
    const downloadUrl = releaseData.assets[0].browser_download_url
    LOGGER.info(`downloading ${downloadUrl} ...`)
    const basename = path.basename(downloadUrl).trim().replace(".tar.gz", "")
    FONT.VERSION_DIR = basename
    LOGGER.info("set font version dir:", FONT.VERSION_DIR)
    return downloadUrl
}

export function cacheExpired(cacheFile, expireDuration) {
    LOGGER.info("checking cache file:", cacheFile)
    return !fs.existsSync(cacheFile) || new Date().getTime() - fs.statSync(cacheFile).mtime.getTime() > expireDuration
}

export async function updateFontCache() {
    FONT.CACHE_TAR_FILE = path.resolve(CACHE_DIR, `${FONT.REPO_OWNER}-${FONT.REPO_NAME}.tar.gz`)
    if (cacheExpired(FONT.CACHE_TAR_FILE, WEEK)) {
        LOGGER.info("font cache is expired, updating...")
        // await downloadLatestRelease(FONT.REPO_OWNER, FONT.REPO_NAME, FONT.CACHE_TAR_FILE)
        const downloadUrl = await updateFontVersionDir(FONT.REPO_OWNER, FONT.REPO_NAME)
        const downloadCommand = ["curl", "-L", "-o", FONT.CACHE_TAR_FILE, downloadUrl].join(" ")
        LOGGER.info("executing:", downloadCommand)
        execSync(downloadCommand, { cwd: CACHE_DIR })
        const decompressCommand = ["tar", "xf", FONT.CACHE_TAR_FILE, "-C", CACHE_DIR].join(" ")
        LOGGER.info("executing:", decompressCommand)
        execSync(decompressCommand, { cwd: CACHE_DIR })
    } else {
        await updateFontVersionDir(FONT.REPO_OWNER, FONT.REPO_NAME)
        LOGGER.info("font cache is up to date")
    }
}

function readDirRecursive(dirPath) {
    return fs
        .readdirSync(dirPath)
        .map((file) => {
            const filePath = path.join(dirPath, file)
            const stats = fs.statSync(filePath)
            if (stats.isDirectory()) {
                return readDirRecursive(filePath)
            } else if (stats.isFile() && path.extname(file) === ".md") {
                return [filePath]
            } else {
                return []
            }
        })
        .reduce((acc, val) => acc.concat(val), [])
}

function readFileContent(filePaths) {
    return filePaths
        .map((filePath) => {
            try {
                const content = fs.readFileSync(filePath, "utf8")
                return content
            } catch (error) {
                LOGGER.error(`read ${filePath} failed:`, error)
                return ""
            }
        })
        .map((str) => [...new Set(str)].join(""))
        .join("")
}

export function makeFont(ttf, dest) {
    const content = readFileContent(readDirRecursive(DOCS_DIR))
    const text = [...new Set(content)].join("")
    ttf = ttf || path.resolve(CACHE_DIR, FONT.VERSION_DIR, `${FONT.REPO_NAME}-${FONT.FONT_STYLE}.ttf`)
    dest = dest || ASSERTS_DIR
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
