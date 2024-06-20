
const wantsMembership = () => {
    const select_pass_types_elem = document.getElementById("pass_types")
    select_pass_types_elem.disabled = false
}

const doesNotWantMembership = () => {
    const select_pass_types_elem = document.getElementById("pass_types")
    select_pass_types_elem.disabled = true
}



document.getElementById("Yes").addEventListener("click",wantsMembership)
document.getElementById("No").addEventListener("click",doesNotWantMembership)