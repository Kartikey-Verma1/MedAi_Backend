import {encode, decode} from "gpt-tokenizer";
import type { IExtractedText } from "../models/document.model.js";

interface ITextChunk{
    text: string,
    pageNumber: number,
    chunkIndex: number
}

const CHUNK_SIZE = 600;
const OVERLAP_SIZE = 100;

const chunkText = (pages: IExtractedText[]) : ITextChunk[] => {
    const chunks: ITextChunk[] = [];
    let chunkIndex = 0;


    for(const page of pages){
        const tokens = encode(page.text);

        if(tokens.length === 0) continue;

        let start = 0;
        
        while(start < tokens.length){
            const end = Math.min(start + CHUNK_SIZE, tokens.length);

            chunks.push({
                text: decode(tokens.slice(start, end)),
                pageNumber: page.pageNumber,
                chunkIndex: chunkIndex++
            });

            if(end === tokens.length) break;
            start = end - OVERLAP_SIZE;
        }
    }
    return chunks;
}

export default chunkText;