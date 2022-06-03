const express = require("express");
const app = express();
const dotenv = require("dotenv");
const puppeteer = require("puppeteer");
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const hbs = require('nodemailer-express-handlebars');
const path = require('path');

dotenv.config();

const port = process.env.PORT;

var stockApi;



// scrap function
async function scrapChannel (url) {
    
    // launching puppeteer
    const browser = await puppeteer.launch();

    // launching a new headless browser page
    const page = await browser.newPage();

    // navigating to the url we are scrapping and waiting until the page reloads
    await page.setDefaultNavigationTimeout(0);
    await page.goto(url);

    const [el] = await page.$x('//*[@id="root"]/div/div[2]/div[2]/div/div/div[1]/div/div/table/tbody/tr[1]/td[1]/a');
    const text = await el.getProperty('textContent');
    const stockName = await text.jsonValue();

    const [el2] = await page.$x('//*[@id="root"]/div/div[2]/div[2]/div/div/div[1]/div/div/table/tbody/tr[1]/td[3]/text()');
    const priceSrc = await el2.getProperty('textContent');
    const priceValue = await priceSrc.jsonValue();

    const [el3] = await page.$x('//*[@id="root"]/div/div[2]/div[2]/div/div/div[1]/div/div/table/tbody/tr[1]/td[4]');
    const lowSrc = await el3.getProperty('textContent');
    const lowValue = await lowSrc.jsonValue();

    const [el4] = await page.$x('//*[@id="root"]/div/div[2]/div[2]/div/div/div[1]/div/div/table/tbody/tr[1]/td[5]');
    const highSrc = await el4.getProperty('textContent');
    const highValue = await highSrc.jsonValue();

    const [el5] = await page.$x('//*[@id="root"]/div/div[2]/div[2]/div/div/div[1]/div/div/table/tbody/tr[1]/td[3]/div');
    const downBy = await el5.getProperty('textContent');
    const downValue = await downBy.jsonValue();

    let downValMod = downValue.replace(/\(.*?\)/gm, "");
    downValMod = downValMod.replace(/\+/g, "");
    downValMod = downValMod.replace(/\-/g, "");

    let priceValMod = priceValue.replace(/\₹/g, "");
    priceValMod = priceValMod.replace(/\,/g, "");

    // converting the value of current price and deduct price from string to float-type
    let currentPrice = parseFloat(priceValMod);
    let deductPrice = parseFloat(downValMod);

    let previousPrice = currentPrice + deductPrice;

    let percentageLoss = ((deductPrice / previousPrice) * 100).toFixed(2);

   console.log(percentageLoss);


   // sending the mail if stock has lost more than 10 percent
   if(percentageLoss * 100 < 1000) {
       function sendMail() {
           const mailTransporter = nodemailer.createTransport({
               service: 'gmail',
               auth: {
                   user: process.env.GID,
                   pass: process.env.GPW
               },
               tls: {
                   rejectUnauthorized: false,
               }
           });

           const handlebarOptions = {
               viewEngine: {
                   extname: '.handlebars',
                   partialsDir: path.resolve('./views'),
                   defaultLayout: false,
               },
               viewPath: path.resolve('./views'),
               extname: '.handlebars',
           }

           mailTransporter.use('compile', hbs(handlebarOptions));
           
           let mailDetails = {
               from: process.env.GID,
               to: process.env.GTO,
               subject: `Your stock is down by ${percentageLoss}%`,
               template: 'email',
               context: {
                   username: 'Subrat',
                   stockName: stockName,
                   percentage: percentageLoss,
                   priceValue: priceValue,
                   lowValue: lowValue,
                   highValue: highValue
               }
           };

           mailTransporter.sendMail(mailDetails, function(err, data) {
            if(err) {
                console.log('Error occurred ' + err);
            }
            else {
                console.log('Email sent successfully');
            }
        });

       }

       

       sendMail();
   }

    stockApi = {
        stockName: stockName,
        currentPrice: priceValue,
        lowPrice: lowValue,
        highPrice: highValue,
        downBy: downValue,
    }

    console.log(stockApi);
   

    // closing the browser
    await browser.close();
}

// scheduling the job everyday at 10 am and 2 pm
cron.schedule('* * * * *', async () => {
    console.log('cron is working');
    scrapChannel("https://groww.in/markets/top-losers?index=GIDXNIFTY100");
})




app.listen(port, () => {
    console.log(`Server is listening to port ${port}`);
});