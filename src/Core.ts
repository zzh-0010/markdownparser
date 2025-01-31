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
const test = '- list 1\n- list 2\nnormal p';
const core = new markdownCore(test);
const tokens = core.coreParse();
console.log(tokens);
console.log(tokens[1].children);

console.log(core.html);

export default markdownCore;
