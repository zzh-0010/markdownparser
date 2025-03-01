//接收Tokens，将Tokens转化为html
import Token from "./Token";

class Render {
    tokens: Token[];
    html: string;

    constructor(tokens: Token[]){
        this.tokens = tokens;
        this.html = '';
    }

    Rendering() {
        for(let i = 0; i < this.tokens.length; i++){
            if(!this.tokens[i].block){
                for(let j = 0; j < this.tokens[i].children.length; j++){
                    const ele = this.tokens[i].children[j];
                    if(ele.tag !== ''){
                        if(ele.tag === 'image'){
                            const rowContent = ele.content;
                            const splitSign = rowContent.indexOf('!](');
                            const info = rowContent.slice(0, splitSign);

                            const other = [rowContent.slice(splitSign + 3, rowContent.indexOf(' ', splitSign)), rowContent.slice(rowContent.indexOf(' ', splitSign) + 1, -1)];
                            this.html = this.html.concat(`<${ele.tag} src="${other[0]}" alt="${info}">`);
                        }
                        else {
                            this.html = this.html.concat(`<${ele.tag}>`);
                            this.html = this.html.concat(ele.content);
                            this.html = this.html.concat(`</${ele.tag}>`);
                        }
                    }
                    else{
                        this.html = this.html.concat(ele.content);
                    }
                }
            }
            else{
                this.html = this.html.concat(this.tokens[i].tag);
            }
        }

        return this.html;
    }
}

export default Render;