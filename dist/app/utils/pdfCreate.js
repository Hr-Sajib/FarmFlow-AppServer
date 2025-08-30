"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStaticPdf = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const generateStaticPdf = () => __awaiter(void 0, void 0, void 0, function* () {
    const browser = yield puppeteer_1.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = yield browser.newPage();
    // Static HTML+CSS to render
    const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #4CAF50; }
          p { font-size: 16px; }
          .footer { margin-top: 40px; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <h1>FarmFlow Static Report</h1>
        <p>This is a sample static PDF generated using Puppeteer inside your API.</p>
        <div class="footer">FarmFlow &copy; 2025</div>
      </body>
    </html>
  `;
    yield page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = yield page.pdf({
        format: "A4",
        printBackground: true,
    });
    yield browser.close();
    return Buffer.from(pdfBuffer);
});
exports.generateStaticPdf = generateStaticPdf;
