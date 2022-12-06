// ========================
// General Node Modules
// ========================
const fs = require('fs');
const path = require('path');

// ========================
// Puppeteer
// ========================
const puppeteer = require('puppeteer');
let options = {headless: false};

// ========================
// Express
// ========================
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
// Server setup
const app = express();
const PORT = 8000;
app.use(cors());
app.listen(PORT, () => console.log(`server running on port ${PORT}`));


// ======================================================
// ======================================================

// CardKingdom Spreddit

// ======================================================
// ======================================================


// ========================
// Main Function
// ========================

async function spreddit(current_set) {

    const card_data  = [];

    await get_ck_prices(current_set, card_data);

    await get_tcg_prices(current_set, card_data);

    await calculate_margins(card_data);

    await write_card_data(card_data);
}

// ========================
// Set Form API
// ========================
app.use(bodyParser.urlencoded({ extended: true }));
app.post('/feed', function(req, res) {
    let current_set = req.body.set;
    res.send('success');
    spreddit(current_set);
});

// ============================
// Get CK Prices Function
// ============================
async function get_ck_prices(current_set, card_data) {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    console.log('Scraping CK Current Set:' + current_set);

    let url = `https://www.cardkingdom.com/mtg/${current_set}`;
    await page.goto(url);

    const perPage = '.perPage';
    await page.waitForSelector(perPage);
    await page.select(perPage, '100');

    const sortBy = '#sortBy';
    await page.waitForSelector(sortBy);
    await page.select(sortBy, 'name_asc');

    let scrape_done = false;
    while(scrape_done == false) {

        const card_selector = '.itemContentWrapper';
        await page.waitForSelector(card_selector);
        const search_cards = await page.$$(card_selector);

        for(let i = 0; i < search_cards.length; i++) {

            const current_card = search_cards[i];
    
            const set_selector = 'table > tbody > tr.detailWrapper > td:nth-child(1) > div > a';
            const title_selector = 'table > tbody > tr.detailWrapper > td:nth-child(1) > span > a';        
            const price_selector = 'div > ul.addToCartByType > li.itemAddToCart > form > div.amtAndPrice > span.stylePrice';

            const set = await current_card.$eval(set_selector, (x_set) => x_set.innerText.trim());
            const title = await current_card.$eval(title_selector, (x_title) => x_title.innerText.trim());
            const ck_retail = await current_card.$eval(price_selector, (x_price) => x_price.innerText.replace(/\$/g, '').trim());

            card_data.push({
                'set': set,
                'title': title,
                'ck_retail': ck_retail,
                'ck_margin': '',
                'tcg_low': ''            
            });   
        }

        const btn_selector = '.page-link[aria-label="Next"]';
        const page_check_selector = '.pagination-arrow-right.disabled';
        const page_check = await page.$(page_check_selector) == null;

        switch (page_check) {
            case true:
                await Promise.all([
                    page.$eval(btn_selector, el => el.click()),
                    page.waitForNavigation({waitUntil: 'networkidle2'})
                ]);
                break;
        
            case false:
                scrape_done = true;
                break;
        }
    }
   
    await browser.close();

    console.log('CK Scraping Completed');

    return card_data;
};

// ============================
// Get TCG Prices Function
// ============================
async function get_tcg_prices(current_set, card_data) {

    let tcg_data = JSON.parse(fs.readFileSync('./data/tcgprices.json', 'utf8'));
    let tcg_set;

    switch (current_set) {
        case 'antiquities':
            tcg_set = 'Antiquities';
            break;
        case 'avacyn-restored':
            tcg_set = 'Avacyn Restored';
            break;
        case 'battle-for-zendikar':
            tcg_set = 'Battle for Zendikar';
            break;
        case 'coldsnap':
            tcg_set = 'Coldsnap';
            break;
        case 'commander-2017':
            tcg_set = 'Commander 2017';
            break;
        case 'commander-2018':
            tcg_set = 'Commander 2018';
            break;
        case 'commander-legends':
            tcg_set = 'Commander Legends';
            break;
        case 'dark-ascension':
            tcg_set = 'Dark Ascension';
            break;
        case 'eventide':
            tcg_set = 'Eventide';
            break;
        case 'innistrad':
            tcg_set = 'Innistrad';
            break;
        case 'lorwyn':
            tcg_set = 'Lorwyn';
            break;
        case 'mirrodin-besieged':
            tcg_set = 'Mirrodin Besieged';
            break;
        case 'ravnica':
            tcg_set = 'Ravnica: City of Guilds';
            break;
        case 'modern-masters':
            tcg_set = 'Modern Masters';
            break;
        case 'morningtide':
            tcg_set = 'Morningtide';
            break;         
        case 'new-phyrexia':
            tcg_set = 'New Phyrexia';
            break;
        case 'rise-of-the-eldrazi':
            tcg_set = 'Rise of the Eldrazi';
            break;
        case 'scars-of-mirrodin':
            tcg_set = 'Scars of Mirrodin';
            break;
        case 'shadowmoor':
            tcg_set = 'Shadowmoor';
            break;
        case 'shards-of-alara':
            tcg_set = 'Shards of Alara';
            break;
        case 'weatherlight':
            tcg_set = 'Weatherlight';
            break;
        case 'worldwake':
            tcg_set = 'Worldwake';
            break;
        case 'zendikar':
            tcg_set = 'Zendikar';
            break;         
    }

    console.log('Updating TCG prices for Current Set:' + tcg_set);
    
    for(let i = 0; i < card_data.length; i++) {

        card_data[i].set = tcg_set;

        for(let j = 0; j < tcg_data.length; j++) {
            if(tcg_data[j].field3 == card_data[i].set && tcg_data[j].field4 == card_data[i].title) {
                let tcg_price = tcg_data[j].field12;
                card_data[i].tcg_low = parseFloat(tcg_price);
            }
        }   
    }

    console.log('TCG Price Update Completed');

    return card_data;
};

// ============================
// Calculate Margins Function
// ============================
async function calculate_margins(card_data) {

    console.log('Calculating Retail Price Margins');

    for(i = 0; i < card_data.length; i++) {
        card_data[i].ck_retail = parseFloat(card_data[i].ck_retail);
        card_data[i].tcg_low = parseFloat(card_data[i].tcg_low);
        parsed_margin = card_data[i].ck_retail - card_data[i].tcg_low;
        card_data[i].ck_margin = parseFloat(parsed_margin).toFixed(2);
    }

    console.log('Margin Calculation Completed');

    return card_data;
};

async function write_card_data(card_data) {

    console.log('Writing Master JSON file to Disk');

    fs.writeFile('./data/master.json', JSON.stringify(card_data), function(err) {
        if (err) throw err;
        console.log('Proccess Completed, Data Ready');
        }
    );
}

// ============================
// Display Feed API
// ============================
app.get('/feed', (req, res) => {
    const master_data = JSON.parse(fs.readFileSync('./data/master.json', 'utf8'));
    res.json(master_data);
});


// ======================================================
// ======================================================

// ABU Games Spreddit

// ======================================================
// ======================================================


// ============================
// ABU Spreddit
// ============================

async function abu_spreddit(){

    card_data = [];

    await get_abu_prices(card_data);

    await abu_tcg_prices(card_data);

    await calculate_abu_margins(card_data);

    await write_abu_retail_spread(card_data);

    await write_abu_buylist_spread(card_data);

}

// ============================
// Get ABU Prices
// ============================

async function get_abu_prices(card_data){

    let data = JSON.parse(fs.readFileSync('./data/abu.json', 'utf8'));

    let sets = data.grouped.groups;

    for(var i = 0; i < sets.length; i++) {

        let cards = sets[i].doclist.docs;

        for(var j = 0; j < cards.length; j++) {

            let set = cards[j].magic_edition_sort;
            let title = cards[j].simple_title;
            let abu_retail = cards[j].price;
            let retail_qty = cards[j].quantity;
            let abu_buylist = cards[j].trade_price;
            let buylist_qty = cards[j].buy_list_quantity;

            card_data.push({
                'set': set,
                'title': title,
                'abu_retail': abu_retail,
                'retail_qty': retail_qty,
                'abu_buylist': abu_buylist,
                'buylist_qty': buylist_qty,
                'tcg_low': '',
                'retail_margin': '',
                'buylist_margin': ''
            });
            
        }
    }

    return card_data;
};

// ============================
// ABU TCG Prices
// ============================

async function abu_tcg_prices(card_data) {

    let data = JSON.parse(fs.readFileSync('./data/tcgprices.json', 'utf8'));
      
    for(let i = 0; i < card_data.length; i++) {

        for(let j = 0; j < data.length; j++) {
            if(data[j].field3 == card_data[i].set && data[j].field4 == card_data[i].title) {
                let tcg_price = data[j].field12;
                card_data[i].tcg_low = parseFloat(tcg_price);
            }
        }   

    }

    return card_data;
};

// ============================
// Calculate ABU Margins
// ============================

async function calculate_abu_margins(card_data) {

    for(i = 0; i < card_data.length; i++) {

        const retail_price = parseFloat(card_data[i].abu_retail);
        const buylist_price = parseFloat(card_data[i].abu_buylist);
        const tcg_price = parseFloat(card_data[i].tcg_low);
        const retail_margin = retail_price - tcg_price;
        const buylist_margin = tcg_price - buylist_price;

        card_data[i].retail_margin = parseFloat(retail_margin).toFixed(2);
        card_data[i].buylist_margin = parseFloat(buylist_margin).toFixed(2);

    }

    return card_data;

}

// ============================
// Write ABU Retail Spreads
// ============================

async function write_abu_retail_spread(card_data) {

    abu_data = [];

    for(let i = 0; i < card_data.length; i++) {

        const set = card_data[i].set;
        const title = card_data[i].title;
        const abu_retail = card_data[i].abu_retail;
        const retail_qty = card_data[i].retail_qty;
        const abu_buylist = card_data[i].abu_buylist;
        const buylist_qty = card_data[i].buylist_qty;
        const tcg_low = card_data[i].tcg_low;
        const retail_margin = card_data[i].retail_margin;
        const buylist_margin = card_data[i].buylist_margin;

        const p_retail_margin = parseFloat(card_data[i].retail_margin);

        if(p_retail_margin <= 0 && retail_qty >= 1) {

            abu_data.push({
                'set': set,
                'title': title,
                'abu_retail': abu_retail,
                'retail_qty': retail_qty,
                'abu_buylist': abu_buylist,
                'buylist_qty': buylist_qty,
                'tcg_low': tcg_low,
                'retail_margin': retail_margin,
                'buylist_margin': buylist_margin
            });
        }
    }

    fs.writeFile('./data/abu_retail_spreads.json', JSON.stringify(abu_data), function(err) {
        if (err) throw err;
        console.log('Proccess Completed, Data Ready');
        }
    );
}

// ============================
// Write ABU Buylist Spreads
// ============================

async function write_abu_buylist_spread(card_data) {

    abu_data = [];

    for(let i = 0; i < card_data.length; i++) {

        const set = card_data[i].set;
        const title = card_data[i].title;
        const abu_retail = card_data[i].abu_retail;
        const retail_qty = card_data[i].retail_qty;
        const abu_buylist = card_data[i].abu_buylist;
        const buylist_qty = card_data[i].buylist_qty;
        const tcg_low = card_data[i].tcg_low;
        const retail_margin = card_data[i].retail_margin;
        const buylist_margin = card_data[i].buylist_margin;

        const p_buylist_margin = parseFloat(card_data[i].buylist_margin);

        if(p_buylist_margin < -1) {

            abu_data.push({
                'set': set,
                'title': title,
                'abu_retail': abu_retail,
                'retail_qty': retail_qty,
                'abu_buylist': abu_buylist,
                'buylist_qty': buylist_qty,
                'tcg_low': tcg_low,
                'retail_margin': retail_margin,
                'buylist_margin': buylist_margin
            });
        }
    }

    fs.writeFile('./data/abu_buylist_spreads.json', JSON.stringify(abu_data), function(err) {
        if (err) throw err;
        console.log('Proccess Completed, Data Ready');
        }
    );
}

abu_spreddit();


