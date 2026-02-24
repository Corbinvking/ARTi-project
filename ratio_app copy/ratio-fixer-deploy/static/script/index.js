const selector = e => document.querySelector(e)
const selectAll = e => Array.from(document.querySelectorAll(e))

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