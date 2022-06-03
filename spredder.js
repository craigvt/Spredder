
function getCat() {
    fetch('https://catfact.ninja/docs/api-docs.json')
    .then((response) => response.json())
    .then((data) => {
        console.log(data);
    })
    .catch((err) => {
        console.log("error with api connection", err);
    })
}

document.getElementById('get-btn').addEventListener('click', getCat);