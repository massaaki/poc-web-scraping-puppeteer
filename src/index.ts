import puppeteer from 'puppeteer';
import cron from 'node-cron';


// Helper
function convertNumber(value: string) {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] === ',') {
      // ignore
    } else if (value[i] === '.') {
      result += '.'
    } else {
      result += value[i];
    }
  }

  return parseFloat(result);
}


async function getStockInfo(list: string[], page: puppeteer.Page) {
  const response: any[] = [];

  for (let i = 0; i < list.length; i++) {
    const name = decodeURI(list[i]);
    console.log(name);

    // load page list
    await page.goto(`https://finance.yahoo.com/quote/${list[i]}`, {
      waitUntil: 'networkidle2'
    });


    // select element
    const result: any = await page.evaluate(() => {
      const info = Array.from(document.querySelectorAll("#quote-header-info div")).map(x => {
        return x.textContent
      });

      // getting informations
      const marketOpen = !!info[15]?.includes("open");
      let data;
      let fluctuationNegative = 1;
      if (info[15]?.includes("+")) {
        data = info[15].split(" ")[0].split("+");
      } else {
        data = info[15]?.split(" ")[0].split("-");
        fluctuationNegative = -1;
      }

      if (data) {
        const value = data[0];
        const fluctuation = data[1];

        return {
          value,
          fluctuation,
          fluctuationNegative,
          marketOpen
        };
      }
      return false;

    })

    response.push({
      name,
      value: convertNumber(result.value),
      fluctuation: result.fluctuation ? convertNumber(result.fluctuation) * result.fluctuationNegative : 0,
      marketOpen: result.marketOpen
    })
  }


  return response;
}


// CRON - crawling every 2min
let count = 0;
async function startCron(list: string[], page: puppeteer.Page) {
  cron.schedule('*/2 * * * *', async () => {
    const stocksInfo = await getStockInfo(list, page);
    count++;
    console.log(`[${count}]`);
    console.log('Crawled..: ', stocksInfo);
  })
}



// MAIN ------------------------------------
async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  //Add Stocks
  const list = ['%5EBVSP', 'BCFF11.SA', 'VALE3.SA', 'CSAN3.SA', 'B3SA3.SA', 'AMAR3.SA', 'AAPL', 'BRK-B'];


  startCron(list, page);
}
main();

