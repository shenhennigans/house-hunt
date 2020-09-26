const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
let feedUrl;
const tableBody = document.getElementById('rss-content-table');
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
        feedInterval = setInterval(getFeed,90000);
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
                let timestamp = (Date(Date.now())).toString();
                feedHeadLine.innerText = getHeadline(doc);
                feedRefreshLine.innerText = ` - last refreshed at ${timestamp}`
                writeToObject(doc);
                constructTable();
            })
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
        listingUrl = item.querySelector('link') ? item.querySelector('link').textContent : '';
        listingPrice = item.querySelector('price') ? item.querySelector('price').textContent : '';
        listingBeds = item.querySelector('bedrooms') ? item.querySelector('bedrooms').textContent : '';
        listingBaths = item.querySelector('bathrooms') ? item.querySelector('bathrooms').textContent : '';
        if(item.querySelector('description')){
            listingDesc = item.querySelector('description').textContent;
            listingImageUrl = scrapeImage(listingDesc);
        }
        if(item.querySelector('pubDate')){
            listingDate = item.querySelector('pubDate').textContent;
            listingDate = listingDate.substring(0, listingDate.length-5);
        }
        listingLat = item.querySelector('lat') ? item.querySelector('lat').textContent : '';
        listingLong = item.querySelector('long') ? item.querySelector('long').textContent : '';
        if(item.querySelector('guid')){
            listingId =  item.querySelector('guid').textContent;
            listingId = listingId.substr((listingId.substr(0, listingId.indexOf('='))).length+1);
        }
        
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
        // construct table entries
        let newTableRow = document.createElement('tr');
        let rowTitle = document.createElement('td');
        let rowMap = document.createElement('td');
        let rowDateListed = document.createElement('td');

        rowTitle.innerHTML = `<div class="card"><img class="card-img-top" src="${listing.imgurl}" alt="listing image"><div class="card-body"><h5 class="card-title"><a href="${listing.url}" target=_blank>${listing.title}</a></h5><div class="card-subtitle mb-2 text-muted">${listing.subtitle}</div><div class="card-text"><p><b>${listing.price}€</b></p><p>${listing.beds} bed rooms & ${listing.baths} bath rooms</p></div></div></div>`
        rowTitle.id = listing.id;
        rowMap.appendChild(constructMap(listing.lat, listing.long));
        rowDateListed.innerText = listing.datelisted;
        
        // append table elements
        newTableRow.appendChild(rowTitle);
        newTableRow.appendChild(rowMap);
        newTableRow.appendChild(rowDateListed);
        tableBody.appendChild(newTableRow);
    });
}

function constructMap(lat, long){
    // construct map
    let mapOuter = document.createElement('div');
    mapOuter.className = 'mapouter';
    let mapCanvas = document.createElement('div');
    mapCanvas.className = 'gmap_canvas';
    let iFrame = document.createElement('iframe');
    iFrame.width= '300';
    iFrame.height = '300';
    iFrame.src=`https://maps.google.com/maps?q=${lat}%2C${long}&t=&z=${mapZoom}&ie=UTF8&iwloc=&output=embed`;
    iFrame.frameborder='0';
    iFrame.scrolling = 'no';
    iFrame.marginheight = '0';
    iFrame.marginwidth = '0';
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
    tableBody.innerHTML = '';
    inputError.innerText = '';
}

function isValidUrl(url){
    return url.startsWith('https://www.daft.ie/rss.daft?');
}