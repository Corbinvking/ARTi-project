/**
 * Sends a get request to the server
 */
const getData = async (url, token = false) => {
    try {
        const data = await fetch(url, {
            method: "GET",
            mode: "cors",
            cache: "no-cache",
            redirect: "follow",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                ...(token && {
                    authorization: token ? "Bearer" + " " + token : ""

                })
            },
        });
        return await data.json();
    } catch (error) {
        return error;
    }
};
// DOM Helpers 
const selector = (e) => document.querySelector(e);
const selectAll = (e) => document.querySelectorAll(e);
const  createElement = (e) => document.createElement(e);

const renderDuplicateCampaign = (data) => {
    try{
        //Select the required Elements 
        const youtubeUrl = selector("#youtube_url")
        const genre = selector("#genre") 
        const commentSheetUrl  = selector("#comments_sheet") 
        const waitTime = selector("#wait_time") 
        const likeServer = selector("#like_server")  
        const commentServer = selector("#comment_server") 
        const sheetTier = selector("#sheet_tier") 
        const minimumEngagement = selector("#minimum_engagement") 
        //Embed contents into the element using the provided data  
        youtubeUrl.value = data["Video Link"] 
        genre.value = data["Genre"] 
        commentSheetUrl.value = data["Comments Sheet URL"] 
        waitTime.value = data["Wait Time"] 
        likeServer.value = data["Like Server ID"] 
        commentServer.value = data["Comment Server ID"]
        sheetTier.value = data["Sheet Tier"]
        minimumEngagement.value = data["Minimum Engagement"] 
    }catch(e){
        console.log('Error while populating modal.')
        return
    }
}


const disabledInputs = Array.from(selectAll(".disable-on-focus"))
disabledInputs.forEach(elem => {
    elem.addEventListener("focus" , async (e) => {
        elem.disabled = true 
    })
    elem.addEventListener("blur" , async (e) => {
        elem.disabled = false 
    })
})



async function duplicateCampaign(campaignId) {
    console.log(campaignId, 'campaignId');

    const modal = document.getElementById('modal-container');
    modal.style.display = 'block';

    const closeBtn = selector(".modal .close") 
        closeBtn.addEventListener("click" , closeEvent => {
            closeEvent.preventDefault()
            modal.style.display = "none"
        })

    const campaignURL =  `/campaigns/${campaignId}`;
    const campaignInfo = await getData(campaignURL)
    renderDuplicateCampaign(campaignInfo)
}


//Handling Modal 
const modalTrigger = selectAll(".modal-trigger") 
const modals = selectAll(".modal") 

modalTrigger.forEach(trigger => {
    trigger.addEventListener("click" , e => {
        e.preventDefault()
        const modalBox = trigger.nextElementSibling 
        modalBox.style.display = "block"

        const closeBtn = selector(".modal .close") 
        closeBtn.addEventListener("click" , closeEvent => {
            closeEvent.preventDefault()
            modalBox.style.display = "none"
        })
    })
})

//Handling Dropdowns 
const dropdownBtns = selectAll(".dropBtn") 
const dropdowns = selectAll(".dropdown")

dropdownBtns.forEach(trigger => {
    trigger.addEventListener("click" , e => {
        e.preventDefault()
        const dropdown = trigger.nextElementSibling 
        dropdown.classList.toggle('hide-show')
    })
})


// Select the search input and campaign list
const searchInput = document.getElementById("form-search");
// const campaignList = document.getElementById("campaign-list");
const campaignList = document.getElementById("main-item");

// Add an event listener to the search input
searchInput.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase(); // Get the search query in lowercase
  const campaigns = campaignList.querySelectorAll(".campaign-article");

  campaigns.forEach((campaign) => {
    const title = campaign.dataset.title; // Get the campaign title from the data attribute
    if (title.includes(query)) {
      campaign.style.display = "block"; // Show the campaign if it matches the query
    } else {
      campaign.style.display = "none"; // Hide the campaign if it doesn't match
    }
  });
});