import puppeteer  from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  const { html, fileName, orderId } = event;

  console.log('Generating PDF for orderId:', orderId);
  let browser;
  let s3Key = null;
  let page;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    // todo: get bucket name by country
    s3Key = `giftcards/${orderId}/${fileName}`;

    console.log('<--------------- JK Index --------------->');
    console.log(s3Key);
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.PDF_BUCKET,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      })
    );

    return {
      ok: true,
      s3Key,
      error: null,
    };
  } catch (error) {
    console.error('Error generating PDF:', error);

    return {
      ok: false,
      s3Key,
      error: error.message,
    };
  } finally {
    if (browser) {
      await page?.close();
      await browser?.close();
    }
  }
};
