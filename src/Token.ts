interface Token { //Token定义
    type: string;
    tag: string;
    attrs?: Array<Array<string>>;
    map?: Array<number>;
    nesting?: number;
    level: number;
    children?: Array<Token>;
    content?: string;
    markup?: string;
    info?: string;
    meta?: string;
    block?: boolean;
    hidden?: boolean;
}

export default Token;