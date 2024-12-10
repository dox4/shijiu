import * as path from "path"
import handlebars from "handlebars"
import * as fs from "fs"
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

export function cacheExpired(cacheFile, expireDuration) {
    LOGGER.info("checking cache file:", cacheFile)
    return !fs.existsSync(cacheFile) || new Date().getTime() - fs.statSync(cacheFile).mtime.getTime() > expireDuration
}

export function readDirRecursive(dirPath) {
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

export function readFileContent(filePaths) {
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
