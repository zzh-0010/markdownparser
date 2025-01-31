import Token from "./Token";

class MarkdownBlockParser {
    src: string;
    lines: string[];
    tokens: Token[];
    initToken: Token;
    lineNow: string; //实时处理的字符串，方便删去markdown语法字符

    constructor(src: string, tokens: Token[]){
        this.src = src;
        this.lines = src.split('\n');
        this.tokens = tokens
        this.initToken = {
            type: "",
            tag: "",
            attrs: [[]],
            map: [],
            nesting: NaN,
            level: NaN,
            children: [],
            content: "",
            markup: "",
            info: "",
            meta: "",
            block: false,
            hidden: false,
          };
        this.lineNow = "";
    }

    blockParse(): Token[] {
        for(let i = 0; i < this.lines.length; i++){

            //这里删去了.trim()，会发生什么呢？
            const line = this.lines[i];
            this.lineNow = line;
            if(this.isHeading(line)) {
                this.parseHeading(line);
            }
            else if(this.isUoList(line)){

                //先push外围的元素
                this.tokens.push({
                    ...this.initToken,
                    type: 'unordered_list_start',
                    tag: `<ul>`,
                    block: true
                });

                //与codeblock类似，挑出无序列表中的每一列
                let j = 0; 
                for(j = i; (j < this.lines.length) && (this.isUoList(this.lines[j])); j++) {
                    const subLine = this.lines[j];

                    this.parseUoList(subLine);

                }

                this.tokens.push({
                    ...this.initToken,
                    type: 'unordered_list_end',
                    tag: `</ul>`,
                    block: true
                });
                i = j - 1;

            }
            else if(this.isBlockquote(line)){
                this.parseBlockQuote(line);
            }
            else if(this.isCodeBlock(line)){

                this.tokens.push({
                    ...this.initToken,
                    type: 'codeblock_start',
                    tag: `<pre><code>`,
                    block: true
                });

                //挑出代码块中的每一行组成块
                let j = 0;
                for(j = i; (j < this.lines.length) && (this.lines[j].startsWith('    ') || this.lines[j].startsWith('\t')); j++){
                    const subLine = this.lines[j];

                    this.parseCodeBlock(subLine);

                }

                this.tokens.push({
                    ...this.initToken,
                    type: 'codeblock_end',
                    tag: `</code></pre>`,
                    block: true
                });
                i = j - 1;
            }
            else {
                this.parseParagraph(line);
            }
        }
        return this.tokens;
    }

    isHeading(line: string): boolean {
        return /^#{1,6}\s/.test(line);
    }

    isUoList(line: string): boolean {
        return /^-\s|\*\s|\+\s/.test(line);
    }

    isBlockquote(line: string): boolean {
        return /^>{1, 3}\s/.test(line);
    }

    isCodeBlock(line: string): boolean {
        return (line.startsWith('    ') || line.startsWith('\t'));
    }

    parseHeading(line: string) {

        //解析#标题
        const level = line.match(/^#{1,6}/)?.[0].length || 1;
        this.lineNow = line.slice(level+1);
        this.tokens.push({
            ...this.initToken,
            type: 'heading_start',
            tag: `<h${level}>`,
            level: level,
            block: true
        });

        this.Inline(this.lineNow); //插入行内元素

        this.tokens.push({
            ...this.initToken,
            type: 'heading_end',
            tag: `</h${level}>`,
            level: level,
            block: true
        });

    }

    parseCodeBlock(line: string) {

        this.lineNow = line.concat('\n');
        this.Inline(this.lineNow); //插入行内元素

    }

    parseBlockQuote(line: string) {
        const level = line.match(/^#{1,3}/)?.[0].length || 1;
        this.lineNow = line.slice(level+1);
        this.tokens.push({
            ...this.initToken,
            type: 'blockquote_start',
            tag: `<blockquote>`,
            level: level,
            block: true
        });

        //解析行内元素
        this.Inline(this.lineNow); 

        this.tokens.push({
            ...this.initToken,
            type: 'blockquote_end',
            tag: `</blockquote>`,
            level: level,
            block: true
        });
    }

    parseUoList(line: string) {
        this.tokens.push({
            ...this.initToken,
            type: 'list_start',
            tag: `<li>`,
            block: true
        });

        this.lineNow = line.slice(2);

        this.Inline(this.lineNow);

        this.tokens.push({
            ...this.initToken,
            type: 'list_end',
            tag: `</li>`,
            block: true
        });

        }

    parseParagraph(line: string) {
        this.tokens.push({
            ...this.initToken,
            type: 'paragraph_start',
            tag: '<p>',
            block: true
        })

        this.Inline(line);

        this.tokens.push({
            ...this.initToken,
            type: 'paragraph_end',
            tag: '</p>',
            block: true
        })
    }

    // 处理行内元素的入口函数
    Inline(line: string) {

        //首先推出Inline token
        this.tokens.push({
            ...this.initToken,
            type: 'Inline',
            children: [],
            block: false
        })

        /* ** | __ | * | _ | []() | ![]() | `` */
        const pattern = /(\*\*.*?\*\*)|(__.*?__)|(\*.*?\*)|(_.*?_)|\[(.*?)\]\((.*?)\)|!\[(.*?)\]\((.*?)\)|`(.*?)`/g;
        let match;
        let lastIndex = 0;

        //循环处理每一个匹配元素
        while((match = pattern.exec(line)) !== null) {
            const [tokenType, content, tag] = this.dealInline(match[0].trim());
            console.log("The match index is: ", match.index);

            if( match.index > lastIndex ){
                this.tokens[this.tokens.length - 1].children.push({
                    ...this.initToken,
                    type: 'text',
                    tag: '',
                    content: line.substring(lastIndex, match.index),
                    block: false
                })
            }
            this.tokens[this.tokens.length - 1].children.push({
                ...this.initToken,
                type: tokenType,
                tag: tag,
                content: content,
                block: false
            })

            lastIndex = pattern.lastIndex;
        }
        if( lastIndex < line.length ){
            this.tokens[this.tokens.length - 1].children.push({
                ...this.initToken,
                type: 'text',
                tag: '',
                content: line.substring(lastIndex),
                block: false
            })
        }

    }

    //行内元素判断
    dealInline(match: string) {  
        if(match.startsWith('**') || match.startsWith('__')) {
            return ['bold', match.slice(2, -2), 'strong'];
        }
        else if(match.startsWith('*') || match.startsWith('_')) {
            return ['italic', match.slice(1, -1), 'em'];
        }
        else if(match.startsWith('!')) {
            //请注意这里，其渲染成html应当是自闭合标签
            return ['image', match.slice(2, match.indexOf(']', 2)), 'image'];
        }
        else if(match.startsWith('[')) {
            //这个是否也一样
            return ['link', match.slice(1, -1), 'herf'];
        }
        else if(match.startsWith('`')) {
            return ['code', match.slice(1, -1), 'code'];
        }
        else {
            return ['text', match, ''];
        }
    }

}

export default MarkdownBlockParser;