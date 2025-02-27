import Token from "./Token";
import MarkdownBlockParser from "./BlockParser";
import Render from "./Render";

class markdownCore {
    tokens: Token[];
    src: string;
    html: string;

    constructor(src: string) {
        this.src = src;
        this.tokens = [];
        this.html = '';
    }

    coreParse(): Token[] {

        //注册并使用块解析器
        const blockP = new MarkdownBlockParser(this.src, this.tokens);
        this.tokens = blockP.blockParse();

        //注册并使用渲染器
        const render = new Render(this.tokens);
        this.html = render.Rendering();

        return this.tokens;
    }
    
}

export default markdownCore;

module.exports = markdownCore;