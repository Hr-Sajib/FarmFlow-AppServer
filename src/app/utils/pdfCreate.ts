import puppeteer from "puppeteer";

export const generateStaticPdf = async (): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    headless:true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

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

  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

return Buffer.from(pdfBuffer);
};
