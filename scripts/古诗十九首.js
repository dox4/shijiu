import * as path from "path"
import * as fs from "fs"
import * as cheerio from "cheerio"
import { Poetry, Line, CACHE_DIR, docPathOf, renderIndex, chineseNumber } from "./common.js"

const TITLE = "古诗十九首"

export async function process(info) {
    const fileName = "古诗十九首.html"
    const absPath = path.join(CACHE_DIR, fileName)
    const cache = fs.readFileSync(absPath, { encoding: "utf8" })
    const $ = cheerio.load(cache)
    const mainDiv = $("#mw-content-text").children("div").first()
    const comment = mainDiv.children("p").first().text().trim()
    const mainComment = comment.substring(1, comment.length - 1)
    renderIndex(
        {
            title: TITLE,
            mainComment: mainComment,
            notice: "本页面及其子页面文字转录自：[维基文库](" + info["source"] + ")",
        },
        docPathOf(TITLE)
    )

    const dlIndex = mainDiv.children("dl").first().index()

    const count = 19
    return {
        text: TITLE,
        items: Array(count)
            .fill(0)
            .map((_, index) => {
                const lineIndex = index * 2 + 1 + dlIndex
                const title =
                    mainDiv.children().eq(lineIndex).children().first().text() + `（其${chineseNumber(index + 1)}）`
                const lines = mainDiv
                    .children()
                    .eq(lineIndex + 1)
                    .children("dd")
                    .map((_, dd) => {
                        let note =
                            dd.children.length == 2
                                ? // dd.children[1] is <small/>
                                  // small.children[0|2] is <span/>
                                  dd.children[1].children[1].data
                                : ""
                        return new Line(dd.children[0].data, note)
                    })
                    .get()
                return new Poetry(title, "", lines)
            })
            .map((poetry) => poetry.render(TITLE)),
    }
}
