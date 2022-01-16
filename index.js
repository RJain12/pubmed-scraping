const petitio = require('petitio');
const csv = require('fast-csv');
const fs = require('fs');
const stream = fs.createReadStream("author_names.csv");
const rp = require('request-promise');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const $ = require('cheerio');

const csvWriter = createCsvWriter({
    path: 'out.csv',
    header: [
        { id: 'name', title: 'NAME' },
        { id: 'articles', title: 'ARTICLES' },
        { id: 'citations', title: 'CITATIONS' }
    ]
});

let authorList = [];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

csv
    .parseStream(stream, { headers: true })
    .on("data", (data) => {
        authorList.push(data.fa, data.la)
    })
    .on("end", async () => {
        try {
            console.log(`Number of authors: ${authorList.length}`);
            for (let i = 0; i < authorList.length; i++) {
                if (authorList[i].length < 3) {
                    await csvWriter.writeRecords({
                        name: authorList[i],
                        articles: 0,
                        citations: 0
                    })
                } else {
                    console.log(i);
                    console.log(authorList[i]);
                    let request = petitio(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${authorList[i]}&api_key=ff73891988e78ce80e8af1b13ec13cc2eb08&retmax=100000&retmode=json`);
                    let string = await request.json();
                    let list = string.esearchresult.idlist;
                    let citations = 0;
                    for (article of list) {
                        rp(`https://pubmed.ncbi.nlm.nih.gov/${article}`)
                            .then((html) => {
                                let amount = parseInt(html.split('"amount">')[1].split("</em>")[0]);
                                if (isNaN(amount)) {
                                    amount = 0;
                                }
                                citations = citations + amount;
                            })
                            .catch((err) => {
                                citations = citations + 0;
                            })
                        await delay(50);
                    }
                    await csvWriter.writeRecords([
                        { name: authorList[i], articles: list.length, citations: citations }
                    ])
                }
            }
        } catch (error) {
            console.log(error)
        }
    });