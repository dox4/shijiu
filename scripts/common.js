import * as path from "path"
import handlebars from "handlebars"
import * as fs from "fs"
export const DOCS_DIR = path.resolve(".", "docs")
export const INDEX_DIR = path.resolve(".", "data")
export const INDEX_FILE = path.resolve(INDEX_DIR, "index.json")
export const CACHE_DIR = path.resolve(".", "cache")
export const SCRIPT_DIR = path.resolve(".", "scripts")
export const { compile } = handlebars

export class Poetry {
    constructor(title, comment, lines) {
        this.title = title
        this.comment = comment
        this.lines = lines
    }

    // json() {
    //     return {
    //         title: this.title,
    //         comment: this.comment,
    //         lines: this.lines,
    //     }
    // }
    render(parent) {
        const target = docPathTo(parent, this.title + ".md")
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
export function docPathTo(title, file) {
    return path.join(DOCS_DIR, title, file || "index.md")
}
