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

            //如果是标题
            if(this.isHeading(line)) {
                this.parseHeading(line);
            }
            //如果是无序列表
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
            else if(this.isList(line)){
                //先push外围的元素
                this.tokens.push({
                    ...this.initToken,
                    type: 'ordered_list_start',
                    tag: `<ol>`,
                    block: true
                });

                //挑出有序列表中的每一列
                let j = 0;
                for(j = i; (j < this.lines.length) && (/^\s*\d+\.\s+/.test(this.lines[j])); j++){
                    const subLine = this.lines[j];

                    this.parseList(subLine);
                }

                this.tokens.push({
                    ...this.initToken,
                    type: 'ordered_list_start',
                    tag: `</ol>`,
                    block: true
                });
                i = j - 1;
                
            }
            //如果是块引用
            else if(this.isBlockquote(line)){
                this.parseBlockQuote(line);
            }
            //如果是代码块
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
            //如果是水平线
            else if(this.isLine(line)){
                this.parseLine(line);
            }
            //如果是表格
            else if(this.isTable(line, i)){
                //先push外围的元素

                this.tokens.push({
                    ...this.initToken,
                    type: 'table',
                    tag: `<table>`,
                    block: true
                });

                //此处开始列举每列的对齐方式
                const newLine = this.lines[i+1].slice(1, -1);
                const preStyle = newLine.split('|');

                const styles = preStyle.map((str) => {
                    const newStr = str.trim();
                    if(newStr.startsWith(':') && !newStr.endsWith(':')){
                        return 'text-align:left';
                    }
                    else if(newStr.endsWith(':') && !newStr.startsWith(':')) {
                        return 'text-align:right';
                    }
                    else if(newStr.endsWith(':') && newStr.startsWith(':')) {
                        return 'text-align:center'
                    }
                    else {
                        return '';
                    }
                })

                //先推送表头的token
                this.parseTHead(line, styles);

                //再推送表格体的token
                this.tokens.push({
                    ...this.initToken,
                    type: 'tbody',
                    tag: `<tbody>`,
                    block: true
                });

                //挑出表格的行
                let j = 0;
                for(j = i + 2; (j < this.lines.length) && (/^(\|\s.*\s){1,}\|$/.test(this.lines[j])); j++){
                    const subLine = this.lines[j];

                    this.parseTable(subLine, styles);
                }

                this.tokens.push({
                    ...this.initToken,
                    type: 'tbody',
                    tag: `</tbody>`,
                    block: true
                });

                this.tokens.push({
                    ...this.initToken,
                    type: 'table',
                    tag: `</table>`,
                    block: true
                });

                i = j - 1;
            }
            else if(this.isImage(line)){
                this.parseImage(line);
            }
            //普通文字段
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

        return (line.startsWith('- ') || line.startsWith('+ ') || line.startsWith('* '));
    }

    isList(line: string): boolean {
        return (line.startsWith('1. '));
    }

    isBlockquote(line: string): boolean {
        return /^>{1,3}\s/.test(line);
    }

    isCodeBlock(line: string): boolean {
        return (line.startsWith('    ') || line.startsWith('\t'));
    }

    isLine(line: string): boolean {
        return /^-{3,}$|^\*{3,}$|^_{3,}$/.test(line);
    }

    isTable(line: string, pos: number): boolean {
        //首先进行标题的匹配
        //注意是否进行结尾匹配
        if(/^(\|.*){1,}\|$/.test(line)) {
            //现在进行第二行的标题匹配
            if(pos+1 < this.lines.length && (/^(\|\s*((-{3,})|(:-{3,})|(:-{3,}:)|(-{3,}:))\s*){1,}\|$/.test(this.lines[pos+1]))) {
                return true;
            }
        }
        return false;
    }

    isImage(line: string): boolean {
        return /^!\[(.*?)\]\((.*?)\)|^\[!\[(.*?)\]\((.*?)\)\]\((.*?)\)/.test(line);
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
        const level = line.match(/^>{1,3}/)?.[0].length || 1;
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

    parseList(line: string) {
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
            type: 'list_start',
            tag: `</li>`,
            block: true
        });
    }

    parseLine(line: string) {
        this.tokens.push({
            ...this.initToken,
            type: 'horizontal_rule',
            tag: `<hr />`,
            block: true
        });
    }

    parseTHead(line: string, styles: Array<string>) {
        //先删除首尾两条竖线
        const newLine = line.slice(1, -1);

        const headings = newLine.split('|');

        this.tokens.push({
            ...this.initToken,
            type: 'tablehead',
            tag: `<thead>`,
            block: true
        });

        for(let k = 0; k < headings.length; k++){
            let styledTag = '';
            styles[k] === '' ? styledTag = '<th>' : styledTag = `<th style="${styles[k]}">`;

            this.tokens.push({
                ...this.initToken,
                type: 'th',
                tag: styledTag,
                block: true
            });

            this.Inline(headings[k]);

            this.tokens.push({
                ...this.initToken,
                type: 'th',
                tag: `</th>`,
                block: true
            });
        }

        this.tokens.push({
            ...this.initToken,
            type: 'tablehead',
            tag: `</thead>`,
            block: true
        });

    }

    parseTable(line: string, styles: Array<string>) {
        const newLine = line.slice(1, -1);

        const headings = newLine.split('|');

        this.tokens.push({
            ...this.initToken,
            type: 'table_row',
            tag: `<tr>`,
            block: true
        });

        for(let k = 0; k < headings.length; k++){
            let styledTag = '';
            styles[k] === '' ? styledTag = '<td>' : styledTag = `<td style="${styles[k]}">`;

            this.tokens.push({
                ...this.initToken,
                type: 'td',
                tag: styledTag,
                block: true
            });

            this.Inline(headings[k]);

            this.tokens.push({
                ...this.initToken,
                type: 'td',
                tag: `</td>`,
                block: true
            });
        }

        this.tokens.push({
            ...this.initToken,
            type: 'table_row',
            tag: `</tr>`,
            block: true
        });
    }

    parseImage(line: string) {
        const rowContent = line;
        let splitSign = rowContent.indexOf('](');
        let info = '';
        let other = [];
        let link = '';
        let ilSplit = 0;
        if(line.startsWith('!')) {
            //不带链接的图片
            info = rowContent.slice(2, splitSign);
            other = [rowContent.slice(splitSign + 2, rowContent.indexOf(' ', splitSign)), rowContent.slice(rowContent.indexOf(' ', splitSign) + 1, -1)];
        }
        else {
            //带链接的图片
            //需要在联机和图片断开
            ilSplit = rowContent.indexOf(')](');
            info = rowContent.slice(3, splitSign);
            link = rowContent.slice(ilSplit + 3, -1);
            other = [rowContent.slice(splitSign + 2, ilSplit), rowContent.slice(rowContent.indexOf(' ', splitSign) + 1, -1)];
        }

        
        if(link) {
            this.tokens.push({
                ...this.initToken,
                type: 'link_image',
                tag: `<a href="${link}">`,
                block: true
            });

            this.tokens.push({
                ...this.initToken,
                type: 'image_lin',
                tag: `<image src=${other[0]} alt=${info}>`,
                block: true
            });

            this.tokens.push({
                ...this.initToken,
                type: 'image_image',
                tag: `</a>`,
                block: true
            });
        }
        else {
            this.tokens.push({
                ...this.initToken,
                type: 'image',
                tag: `<image src=${other[0]} alt=${info}>`,
                block: true
            });
        }
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
        const pattern = /(\*\*.*?\*\*)|(__.*?__)|(\*.*?\*)|(_.*?_)|(\[(.*?)\]\((.*?)\))|(`(.*?)`)|(~~.*?~~)/g;
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
        else if(match.startsWith('[') && !match.startsWith('[!')) {
            //这个是否也一样
            return ['link', match.slice(1, -1), 'a'];
        }
        else if(match.startsWith('`')) {
            return ['code', match.slice(1, -1), 'code'];
        }
        else if(match.startsWith('~~')) {
            return ['delete_line', match.slice(2, -2), 's'];
        }
        else {
            return ['text', match, ''];
        }
    }

}

export default MarkdownBlockParser;