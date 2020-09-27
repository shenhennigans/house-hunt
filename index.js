const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
let feedUrl;
const contentWrapper = document.getElementById('rss-content-wrapper');
const refreshBtn = document.getElementById('refresh');
const btnSubmitUrl = document.getElementById('btnSubmitUrl');
const urlInput = document.getElementById('urlInput');
const feedHeadLine = document.getElementById('feed-type');
const feedRefreshLine = document.getElementById('refresh-time');
const inputError = document.getElementById('input-error');
const mapZoom = '15';
let allListings = [];
let feedInterval; 

refreshBtn.addEventListener('click', function(){
    clearInterval(feedInterval);
    getFeed();
    feedInterval = setInterval(getFeed,900000);
})

btnSubmitUrl.addEventListener('click', function(){
    if(isValidUrl(urlInput.value)){
        feedUrl = urlInput.value;
        saveConfig();
        getFeed();
    }
    else {
        inputError.innerText = 'please enter a valid daft.ie rss url';
    }
})

function readConfig(){
    if (localStorage.getItem("ConfigLocalStorage") == null){
        urlInput.value = '';
        urlInput.placeholder = 'enter a daft.ie rss url';
    }
    else {
        const config = JSON.parse(localStorage.getItem("ConfigLocalStorage"))
        feedUrl = config.feedUrl;
        urlInput.value = config.feedUrl;
        getFeed();
        // refresh every 15 min
        feedInterval = setInterval(getFeed,900000);
    } 
}

function saveConfig(){
    const config = {
        feedUrl: urlInput.value,
    }
    localStorage.setItem('ConfigLocalStorage', JSON.stringify(config)) 
}

function getFeed(){
    clearData();
    if(feedUrl != null){
        urlInput.value = feedUrl;
        fetch(proxyUrl + feedUrl)
        .then((res) => {
            res.text()
            .then((xmlTxt) => {
                var domParser = new DOMParser();
                let doc = domParser.parseFromString(xmlTxt, 'text/xml');
                feedHeadLine.innerText = getHeadline(doc);
                feedRefreshLine.innerText = ` last refreshed ${getTimeStamp()}`
                writeToObject(doc);
                constructTable();
            })
            .catch(error => {
                inputError.innerText = `an error occurred parsing rss feed: ${error.message}`;
            })
        })
        .catch(error => {
            inputError.innerText = `an error occurred fetching rss feed: ${error.message}`;
        })
    }
    else{
        inputError.innerText = 'please enter a valid daft.ie rss url';
    }
}

function writeToObject(doc){
    doc.querySelectorAll('item').forEach((item) => {
        let listingTitle = '';
        let listingTitleMain = '';
        let listingTitleSub = '';
        let listingUrl;
        let listingPrice;
        let listingBeds;
        let listingBaths;
        let listingDesc = '';
        let listingImageUrl = '';
        let listingDate = '';
        let listingLat;
        let listingLong;
        let listingId = '';

        if(item.querySelector('title')){
            listingTitle = item.querySelector('title').textContent;
            listingTitle = listingTitle.replace("\\","");
            listingTitleMain = listingTitle.substr(0, listingTitle.indexOf(','));
            listingTitleSub = listingTitle.substr(listingTitleMain.length+1); 
        }
        if(item.querySelector('description')){
            listingDesc = item.querySelector('description').textContent;
            listingImageUrl = scrapeImage(listingDesc);
        }
        if(item.querySelector('pubDate')){
            listingDate = item.querySelector('pubDate').textContent;
            listingDate = listingDate.substring(0, listingDate.length-5);
        }
        if(item.querySelector('guid')){
            listingId =  item.querySelector('guid').textContent;
            listingId = listingId.substr((listingId.substr(0, listingId.indexOf('='))).length+1);
        }
        listingUrl = item.querySelector('link') ? item.querySelector('link').textContent : '';
        listingPrice = item.querySelector('price') ? item.querySelector('price').textContent : '';
        listingBeds = item.querySelector('bedrooms') ? item.querySelector('bedrooms').textContent : '';
        listingBaths = item.querySelector('bathrooms') ? item.querySelector('bathrooms').textContent : '';
        listingLat = item.querySelector('lat') ? item.querySelector('lat').textContent : '';
        listingLong = item.querySelector('long') ? item.querySelector('long').textContent : '';

        let listingObject = {
            id : listingId,
            title : listingTitleMain,
            subtitle : listingTitleSub,
            url : listingUrl,
            imgurl: listingImageUrl,
            price : listingPrice,
            beds : listingBeds,
            baths : listingBaths,
            description : listingDesc,
            datelisted : listingDate,
            lat: listingLat,
            long : listingLong
        }
        allListings.push(listingObject);
    })
}

function constructTable(){
    allListings.forEach(listing => {
        // create dom elements
        let TableRow = document.createElement('div');
        let TableColumn1 = document.createElement('div');
        let TableColumn2 = document.createElement('div');
        let divider = document.createElement('hr');
        TableRow.className = 'row';
        TableColumn1.className = 'col-12 col-lg-6 listing-card';
        TableColumn2.className = 'col-12 col-lg-6 listing-map';
        divider.className = 'dashed';
        
        // set element content
        TableColumn1.innerHTML = `<div class="card"><img class="card-img-top" src="${listing.imgurl}" alt="listing image"><div class="card-body"><h5 class="card-title"><a href="${listing.url}" target=_blank>${listing.title}</a></h5><div class="card-subtitle mb-2 text-muted">${listing.subtitle}</div><div class="card-text"><p><b>${listing.price}€</b></p><p>${listing.beds} bed rooms & ${listing.baths} bath rooms</p><p>Listed on ${listing.datelisted}</p></div></div></div>`;
        TableColumn1.id = listing.id;
        TableColumn2.appendChild(constructMap(listing.lat, listing.long));

        // append elements to page
        TableRow.appendChild(TableColumn1);
        TableRow.appendChild(TableColumn2);
        contentWrapper.appendChild(TableRow);
        contentWrapper.appendChild(divider);
    })
}

function constructMap(lat, long){
    // create dom elements
    let mapOuter = document.createElement('div');
    let mapCanvas = document.createElement('div');
    let iFrame = document.createElement('iframe');

    // set element properties
    mapOuter.className = 'mapouter';
    mapCanvas.className = 'gmap_canvas';
    iFrame.width= '100%';
    iFrame.height = '100%';
    iFrame.src=`https://maps.google.com/maps?q=${lat}%2C${long}&t=&z=${mapZoom}&ie=UTF8&iwloc=&output=embed`;
    iFrame.frameborder='0';
    iFrame.scrolling = 'no';
    iFrame.marginheight = '0';
    iFrame.marginwidth = '0';

    // construct map component
    mapCanvas.appendChild(iFrame);
    mapOuter.appendChild(mapCanvas);

    return mapOuter;
}

function getHeadline(doc){
    let feedChannel = doc.querySelector('channel');
    return feedChannel.querySelector('description') ? feedChannel.querySelector('description').textContent : '';
}

function scrapeImage(desc){
    
    let startIndex = ((desc.substr((desc.substr(0,(desc.search("<img src=")))).length)).substr(0, ((desc.substr((desc.substr(0,(desc.search("<img src=")))).length)).search("/>")))).search('"');
    
    let endIndex = ((desc.substr((desc.substr(0,(desc.search("<img src=")))).length)).substr(0, ((desc.substr((desc.substr(0,(desc.search("<img src=")))).length)).search("/>"))).substr(((desc.substr((desc.substr(0,(desc.search("<img src=")))).length)).substr(0, ((desc.substr((desc.substr(0,(desc.search("<img src=")))).length)).search("/>"))).substr(0,(startIndex))).length+1)).search('"');
    
    let imageUrl = ((desc.substr((desc.substr(0,(desc.search("<img src=")))).length)).substr(0, ((desc.substr((desc.substr(0,(desc.search("<img src=")))).length)).search("/>"))).substr(((desc.substr((desc.substr(0,(desc.search("<img src=")))).length)).substr(0, ((desc.substr((desc.substr(0,(desc.search("<img src=")))).length)).search("/>"))).substr(0,(startIndex))).length+1)).substr(0,endIndex);
    
    return imageUrl;

}

function clearData(){
    allListings = [];
    feedHeadLine.innerText = '';
    feedRefreshLine.innerText = '';
    contentWrapper.innerHTML = '';
    inputError.innerText = '';
}

function isValidUrl(url){
    return url.startsWith('https://www.daft.ie/rss.daft?');
}

function getTimeStamp(){
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let d = new Date();
    let day = d.getDate();
    let numMonth = d.getMonth();
    let month = months[numMonth];
    let hrs = d.getHours();
    if (hrs.toString().length == 1) {
        hrs = "0" + hrs;
    }
    let min = d.getMinutes();
    if (min.toString().length == 1) {
        min = "0" + min;
    }
    return `${month} ${day}, ${hrs}:${min}`;
}