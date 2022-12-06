
const feed = document.getElementById('feed');
let feedUrl = 'http://localhost:8000/feed';

async function get_card_data() {
    fetch(feedUrl)
    .then(response => response.json())
    .then(data => {
        data.forEach(card => {

            const cardGroup = 
                `<div class="card-group">
                <div class="card-set card-item">` + card.set + `</div>
                <div class="card-title card-item">` + card.title + `</div>
                <div class="card-ck-retail card-item">` + card.ck_retail + `</div>
                <div class="card-retail-margin card-item">` + card.ck_margin + `</div>
                <div class="card-tcglow card-item">` + card.tcg_low + `</div></div>`

            feed.insertAdjacentHTML('beforeend', cardGroup);
        })

        let retail_margins = document.getElementsByClassName('card-retail-margin');
        for(let i = 0; i < retail_margins.length; i++) {

            let value = retail_margins[i].textContent;
            let parsedValue = parseFloat(value);
            let finalValue = parsedValue - (parsedValue * .10);

            if(finalValue < 0) {
                retail_margins[i].style.color = "white";
                retail_margins[i].style.background = "#108f23";
            }
        }
    });
}

// set form
$('#setForm').submit(function(e){
    e.preventDefault();
    $.ajax({
        url: feedUrl,
        type: 'post',
        data:$('#setForm').serialize()       
    });
});

$('#display-data-btn').click( () => {
    get_card_data();
})