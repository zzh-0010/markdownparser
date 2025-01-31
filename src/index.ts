import Token from "./Token";
import markdownCore from "./Core";

class Markdown {
    src: string;

    constructor(src: string) {
        this.src = src;
    }

    parse(): string {
        const core = new markdownCore(this.src);
        return "";
    }
}

const test = '# This is the **first** heading.';
const md = new Markdown(test);



