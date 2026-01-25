/**
 * @fileoverview Parser registry
 */

import type { IParser } from "./base.parser";
import { DocxParser } from "./docx.parser";
import { ExcelParser } from "./excel.parser";
import { HtmlParser } from "./html.parser";
import { JsonXmlParser } from "./json-xml.parser";
import { PdfParser } from "./pdf.parser";
import { PptxParser } from "./pptx.parser";
import { TextParser } from "./text.parser";

/**
 * Get appropriate parser for file
 */
export function getParser(mimeType: string, filename: string): IParser | null {
    const parsers: IParser[] = [
        new PdfParser(),
        new DocxParser(),
        new PptxParser(),
        new ExcelParser(),
        new HtmlParser(),
        new JsonXmlParser(),
        new TextParser(),
    ];

    return parsers.find((parser) => parser.canParse(mimeType, filename)) || null;
}

export type { IParser } from "./base.parser";
export { BaseParser } from "./base.parser";
export { DocxParser } from "./docx.parser";
export { ExcelParser } from "./excel.parser";
export { HtmlParser } from "./html.parser";
export { JsonXmlParser } from "./json-xml.parser";
export { PdfParser } from "./pdf.parser";
export { PptxParser } from "./pptx.parser";
export { TextParser } from "./text.parser";
