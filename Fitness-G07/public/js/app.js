const bookNow = (_id) => {
    const loginStatus = document.getElementById("loginStatus").value
    if(loginStatus === "true") {
        
        const classId = _id
        const className = document.getElementById("class_name_" + _id).value
        const instructorName = document.getElementById("class_instructor_" + _id).value
        let classLength = document.getElementById("class_length_" + _id).value
        classLength = parseInt(classLength)

        const classToAddToCart = {_id:classId,class_name:className,instructor_name:instructorName,class_length:classLength}
        const classToAddToCartAsJSON = JSON.stringify(classToAddToCart)
        //console.log(classToAddToCartAsJSON)

        fetch("/cart/add",{method:"POST", body:classToAddToCartAsJSON, headers:{"Content-Type":"application/json"}})
        .then(response=>{
            return response.json()
        })
        .then(responseAsJson=>{
            //console.log(responseAsJson)
            if(responseAsJson.code === 200)
            {
                const book_now_button = document.getElementById(_id)
                book_now_button.setAttribute("disabled","true")
                book_now_button.style.backgroundColor= "grey"
                const inCartId = "inCart_" + _id
                document.getElementById(inCartId).innerHTML ="This class is already in your cart"
            }
            else {
                const inCartId = "inCart_" + _id
                document.getElementById(inCartId).innerHTML = responseAsJson.msg
            }
        })
        .catch(err=>{
            console.log(err)
        })
    }
    else {
        window.location.href = "http://localhost:3000/login"
    }    
}
