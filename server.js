const express = require("express");
const app = express();
const HTTP_PORT = process.env.PORT || 3000;
app.use(express.static('public')); //App is going to use static files in our 'public' folder
app.use(express.json()); //to read json data from client
//body parser
const bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())
// handlebars
const exphbs = require('express-handlebars');
app.engine('.hbs', exphbs.engine({ extname: '.hbs'}));
app.set('view engine', '.hbs');
// setting up sessions
const session = require('express-session')
app.use(session({
    secret: "the quick brown fox jumped over the lazy dog 1234567890",  // random string, used for configuring the session
    resave: false,
    saveUninitialized: true
}))

const mongoose = require("mongoose");
const { response } = require("express");
mongoose.connect("mongodb+srv://ranjithmailbox1:12345@cluster0.lffbaob.mongodb.net/")

// Changes ---> Login , Classes updated to Database

const Schema = mongoose.Schema
const userSchema = new Schema({userEmail:String, password:String, isAdmin:Boolean})
const User = mongoose.model("users", userSchema)

const classesSchema = new Schema({ photo:String, class_name:String, instructor_name:String, class_length: Number})
const Classes = mongoose.model("classes", classesSchema)

const cartSchema = new Schema({userEmail:String,interested_classes:Array})
const Cart = mongoose.model("cart",cartSchema,"cart")

const paymentHistorySchema = new Schema({name:String,email:String,creditcard:Number,enrolledClasses:Array,amount_paid:Number})
const purchaseList = mongoose.model("purchaseList",paymentHistorySchema,"purchaseList")


const classes = [
  {
    photo : "../assets/spin.jpg",
    class_name : "SPIN-BEGINNER",
    instructor_name : "RILEY",
    class_length : 30
  },
  {
    photo : "../assets/yoga.jpg",
    class_name : "ASHTANGA YOGA",
    instructor_name : "PETER",
    class_length : 50
  },
  {
    photo : "../assets/hiit_beginner.jpg",
    class_name : "HIIT -BEGINNER",
    instructor_name : "MICHELLE",
    class_length : 60
  },
  {
    photo : "../assets/zumba.jpg",
    class_name : "ZUMBA",
    instructor_name : "JOSH",
    class_length : 40
  },
  {
    photo : "../assets/hiit_advanced.jpg",
    class_name : "HIIT-ADVANCED",
    instructor_name : "CONAN",
    class_length : 60
  }
]

async function populateClasses() {
  try {
    const count = await Classes.countDocuments({});
    if (count === 0) {
      await Classes.insertMany(classes);
      console.log("Classes collection populated with default data.");
    }
  } catch (error) {
    console.error("Error populating classes collection: ", error);
  }
}

populateClasses();



//-------ENDPOINTS-------
app.get("/", (req, res) => {

  res.render("home",{layout:"primary", login:req.session.loginState, showAdminInterface:req.session.AdminUser,classes:classes,cssFileName:"main_home.css"})
});

app.get("/classes", (req, res) => {
  Classes.find({}).lean().exec()
    .then((result) => {
      const classes = result;
      res.render("classes", { layout: "primary", login: req.session.loginState, showAdminInterface: req.session.AdminUser, classes: classes, cssFileName: "main_classes.css" })
    })
    .catch(err => {
      console.log(err);
      res.status(500).send("Error retrieving classes from database.");
    });
});



app.get("/checkout",(req, res) => {

  if(req.session.loggedInUser !== undefined) //else the user would be able to access this through /checkout url on the browser
  {
      
      Cart.find({userEmail:req.session.loggedInUser.userEmail}).lean().exec()
      .then(result=>{
        //if cart.interested_classes.length === 0 then you should redirect to errors page
          if(result.length > 0 && result[0].interested_classes.length > 0){
            const cartToShow = result[0].interested_classes
            let classes_length = 0
            for(i=0;i<cartToShow.length;i++){
              classes_length += cartToShow[i].class_length
            }
            const subtotal = (classes_length * 0.58).toFixed(2)
            const tax = (subtotal * 0.13).toFixed(2)
            const total = (parseFloat(subtotal) + parseFloat(tax)).toFixed(2)

            res.render("checkout-page",{layout:"primary", login:req.session.loginState, showAdminInterface:req.session.AdminUser, cart:cartToShow,subtotal:subtotal,tax:tax,total:total, cssFileName:"main_checkout_page.css",jsFileName:"checkout.js"})
          }
          else if(result.length === 0 || result[0].interested_classes.length === 0 ){
            res.render("error",{layout:"primary", login:req.session.loginState, showAdminInterface:req.session.AdminUser,errMsg:"Sorry, you do not have any items in your cart.", cssFileName:"error.css"})
          }
        })
        .catch(err=>{
          console.log(err)
        })  
  }
  else {
    return res.redirect("/")
  }
})



app.post("/checkout",(req,res)=>{
  console.log("Form submitted")

  const nameFromUI = req.body.userName
  const emailFromUI = req.body.userEmail
  const creditcardFromUI = req.body.userCreditcardNum
  const card_expiryFromUI = req.body.userCreditcardExpiry
  const wantsMembershipFromUI = req.body.wantsMembership //values for wantsMembershipFromUI = true / false
  let pass_TypeFromUI = undefined //values for pass_TypeFromUI = undefined/yearly/monthly
  if (wantsMembershipFromUI){
    pass_TypeFromUI = req.body.userPass
  }




  let cartToAdd = undefined
  let classes_length = 0
  let subtotal = 0
  let tax = 0
  let total = 0
  let cartId = undefined

  Cart.find({userEmail:req.session.loggedInUser.userEmail}).lean().exec()
      .then(result=>{
          if(result.length > 0){
            cartId = result[0]._id
            cartToAdd = result[0].interested_classes
            classes_length = 0
            for(i=0;i<cartToAdd.length;i++){
              classes_length += cartToAdd[i].class_length
            }
            subtotal = (classes_length * 0.58).toFixed(2)
            tax = (subtotal * 0.13).toFixed(2)
            total = (parseFloat(subtotal) + parseFloat(tax)).toFixed(2)
            
          }
        })
        .then(()=>{
          const credit_card_regex = /^[^a-zA-Z]*$/
          const card_expiry_regex = /^((0[1-9])|(1[0-2]))\/((20[2-9][0-9]))$/
          if(nameFromUI.trim()==="" || emailFromUI.trim()==="" || creditcardFromUI.trim()==="" || card_expiryFromUI.trim()==="" || !credit_card_regex.test(creditcardFromUI) || !card_expiry_regex.test(card_expiryFromUI))
          {
            if(nameFromUI.trim()==="")
            {
                return res.render("checkout-page",{layout:"primary", login:req.session.loginState, showAdminInterface:req.session.AdminUser,errMsg:"Enter a name", cart:cartToAdd,subtotal:subtotal,tax:tax,total:total, cssFileName:"main_checkout_page.css",jsFileName:"checkout.js"})
            }
            else if(emailFromUI.trim()==="")
            {
              return res.render("checkout-page",{layout:"primary", login:req.session.loginState, showAdminInterface:req.session.AdminUser,errMsg:"Enter an email id", cart:cartToAdd,subtotal:subtotal,tax:tax,total:total, cssFileName:"main_checkout_page.css",jsFileName:"checkout.js"})
            }
            else if (creditcardFromUI.trim()===""){
              return res.render("checkout-page",{layout:"primary", login:req.session.loginState, showAdminInterface:req.session.AdminUser,errMsg:"Enter a credid card number", cart:cartToAdd,subtotal:subtotal,tax:tax,total:total, cssFileName:"main_checkout_page.css",jsFileName:"checkout.js"})
            }
            else if (card_expiryFromUI.trim()===""){
              return res.render("checkout-page",{layout:"primary", login:req.session.loginState, showAdminInterface:req.session.AdminUser,errMsg:"Enter credit card expiry", cart:cartToAdd,subtotal:subtotal,tax:tax,total:total, cssFileName:"main_checkout_page.css",jsFileName:"checkout.js"})
            }
            else if (!credit_card_regex.test(creditcardFromUI)){
              return res.render("checkout-page",{layout:"primary", login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg: "Credit Card number cannot have alphabets",cart:cartToAdd,subtotal:subtotal,tax:tax,total:total, cssFileName:"main_checkout_page.css",jsFileName:"checkout.js"})
            }
            else if (!card_expiry_regex.test(card_expiryFromUI)){
              return res.render("checkout-page",{layout:"primary", login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg: "Credit Card expiry date should be of the specified format",cart:cartToAdd,subtotal:subtotal,tax:tax,total:total, cssFileName:"main_checkout_page.css",jsFileName:"checkout.js"})
            }   
          }


          //checking if cartToAdd is not empty before completing transaction
          if (cartToAdd.length === 0){
            return res.render("error",{layout:"primary", login:req.session.loginState, showAdminInterface:req.session.AdminUser,errMsg:"Sorry, you do not have any items in your cart.", cssFileName:"error.css"})
          }
          
          if(pass_TypeFromUI === "yearly" || pass_TypeFromUI === "monthly")
          {
            cartToAdd = {class_name:pass_TypeFromUI.toUpperCase()}
            if(pass_TypeFromUI === "yearly"){
              total = 900 + (900 * 0.13)
            }
            else if(pass_TypeFromUI === "monthly")
            {
              total = 75 + (75*0.13)
            }
            
          }
          const orderToAdd = new purchaseList({name:nameFromUI,email:emailFromUI,creditcard:parseInt(creditcardFromUI),enrolledClasses:cartToAdd,amount_paid:total})
          orderToAdd.save()
          .then(result=>{
            if(result !== null){
              console.log("Sucessfully added to payment history collection")
              Cart.deleteOne({_id:cartId}).lean().exec()
              .then(result=>{
                console.log("Removed cart")
                
              })
              .then(()=>{
                return res.render("order-confirmation",{layout:"primary", login:req.session.loginState, showAdminInterface:req.session.AdminUser,confirmation_id:result._id,enrolledClasses:cartToAdd,cssFileName:"main_order_confirmation_page.css"})
              })
              .catch(err=>{
                console.log(err)
              })
              
            }
          })
          .catch(err=>{
            console.log(err)
          })

        })
        .catch(err=>{
          console.log(err)
        }) 


})

app.post("/checkout/delete/:id", (req, res) => {

  const classDeleteId = req.params.id    
  
  Cart.find({userEmail:req.session.loggedInUser.userEmail}).lean().exec() 
    .then((result) => {

        for (let i = 0; i < result[0].interested_classes.length ; i++){
          if(result[0].interested_classes[i]._id === classDeleteId){

            Cart.updateOne({_id:result[0]._id},{$pull:{interested_classes:{ _id: classDeleteId }}}).lean().exec() 
            .then((result) => {

                return res.redirect("/checkout")
            })
            .catch((err) => {
               return res.json("some error")
            })

          }
        }
    })
    .catch((err) => {
      return res.json("some error")
    })
 
})


app.get("/login",(req, res) => {
  res.render("user-authentication",{layout:"primary",cssFileName:"main_user_authentication.css"})
})

app.post("/login",(req, res) => {
  
  const userEmail = req.body.user_Email
  const userPassword = req.body.user_Password
  const login_or_create = req.body.submit_button
  const email_regex = /^[a-z\@\.]+$/

  //Server-side validation
  if(userEmail === "" || userPassword.trim() === "" || !userEmail.includes('@') || !userEmail.includes('.') || !email_regex.test(userEmail)){
    if(userEmail === "") {
      return res.render("user-authentication",{layout:"primary",cssFileName:"main_user_authentication.css",login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg:"Must provide an email id"})
    }
    else if (userPassword.trim() === "")
    {
      return res.render("user-authentication",{layout:"primary",cssFileName:"main_user_authentication.css",login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg:"Must provide a password"})
    }
    else if (!userEmail.includes('@'))
    {
      return res.render("user-authentication",{layout:"primary",cssFileName:"main_user_authentication.css",login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg:"Email id must include an @ followed by a domain name"})
    }
    else if (!userEmail.includes('.')) {
      return res.render("user-authentication",{layout:"primary",cssFileName:"main_user_authentication.css",login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg:"Email id must include a '.' followed by an extension"})
    }
    else if (!email_regex.test(userEmail))
    {
      return res.render("user-authentication",{layout:"primary",cssFileName:"main_user_authentication.css",login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg:"Must provide a valid email id. Example : username@domainname.extension using only lowercase letters"})
    }
    else {
      return res.render("user-authentication",{layout:"primary",cssFileName:"main_user_authentication.css",login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg:"Must provide a valid email id. Example : username@domainname.extension"})
    }
  }

    if(login_or_create === "login")
  {
    User.findOne({userEmail: userEmail}).lean().exec()
    .then((result)=>{

        if (result === null) {
          return res.render("user-authentication",{layout:"primary",cssFileName:"main_user_authentication.css",login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg:`Couldn't find an account with email address ${userEmail}`})
        }

        const matchingUser = result
        
        if (matchingUser.password === userPassword) {
          //console.log(`The loggedIn user is ${matchingUser}`)
          req.session.loggedInUser = matchingUser
          if(req.session.loggedInUser.isAdmin){
            req.session.AdminUser = true
          }
          else {
            req.session.AdminUser = false
          }
          req.session.loginState = true

          return res.redirect("/classes")
        }
        else {
          return res.render("user-authentication",{layout:"primary",cssFileName:"main_user_authentication.css",login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg:`Incorrect password`})
        }

    })
    .catch((err) => {
      return res.status(500).send(err)
    })   

  }
  else if(login_or_create === "create") {
    //console.log("create button pushed")
    //users.push({user_Email:userEmail, user_Password:userPassword})
    //console.log(users)
    User.findOne({userEmail: userEmail}).lean().exec()
    .then((result)=>{

        if (result === null) {
          const userToAdd = new User({userEmail:userEmail,password:userPassword,isAdmin:false})
          userToAdd.save()
          .then((createdUser)=>{
            if(createdUser===null){
              return res.render("user-authentication",{layout:"primary",cssFileName:"main_user_authentication.css",login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg:`Failed to create your account`})
            }
            //console.log(createdUser)
            req.session.loggedInUser = createdUser
            req.session.loginState = true
            return res.redirect("/classes")
          })
          .catch(err=>{
            return res.status(500).send(err)
          })
        }
        else {
          return res.render("user-authentication",{layout:"primary",cssFileName:"main_user_authentication.css",login:req.session.loginState, showAdminInterface:req.session.AdminUser, errMsg:`An account with the email id you entered already exists`})
        }

      })
  }
   
})

app.get("/logout",(req, res) => {
  req.session.loggedInUser = undefined
  req.session.loginState = false
  req.session.AdminUser = false
  res.redirect("/") 
})

app.get("/orders/all",(req,res)=>{

  if(req.session.loggedInUser !== undefined && req.session.loggedInUser.isAdmin === true) //else the user would be able to access this through /orders/all url on the browser
  {
    let orders = undefined
    purchaseList.find({}).lean().exec()
    .then(result=>{
      orders = result
      return res.render("all-orders",{layout:"primary",cssFileName:"main_all_orders.css",login:req.session.loginState, showAdminInterface:req.session.AdminUser,orders:orders})
    })
    .catch(err=>{
      console.log(err)
    })
    
  }
  else {
    return res.redirect("/")
  }
  
})

app.post("/cart/add",(req,res)=>{
  const _idToAdd = req.body._id
  const class_nameToAdd = req.body.class_name
  const instructor_nameToAdd = req.body.instructor_name
  const class_lengthToAdd = req.body.class_length
  const classToAdd = {_id:_idToAdd,class_name:class_nameToAdd,instructor_name:instructor_nameToAdd,class_length:class_lengthToAdd}

  Cart.find({userEmail:req.session.loggedInUser.userEmail}).lean().exec()
  .then(result=>{
    if(result.length===0){
      console.log("Creating new cart for this user")
      const cart = new Cart({userEmail:req.session.loggedInUser.userEmail,interested_classes:[classToAdd]})
  
      cart.save()
      .then(result => {
        if(result===null)
          {
            return res.json({msg:"Couldn't add to cart",code:500})
          }
        else return res.json({msg:"Successfully added to cart",code:200})
      })
      .catch(err=>{
        return res.json({msg:err,code:500})
      })

    }
    else if (result.length > 0) {
        console.log("Cart already exists for this user")
        let flag = -1
        for(i=0;i<result[0].interested_classes.length;i++){
          if(result[0].interested_classes[i].class_name === classToAdd.class_name){
            console.log("Class already exists in the cart")
            flag = 1
          }
        }
        if(flag===-1){
          Cart.updateOne({_id:result[0]._id},{$push:{interested_classes:classToAdd}})
          .then(result=>{
          if(result===null)
          {
            return res.json({msg:"Couldn't update cart",code:500})
          }
            else return res.json({msg:"Successfully updated cart",code:200})
          })
          .catch(err=>{
          return res.json({msg:err,code:500})
          })
        }
        
    }
  })
  .catch(err=>{
    return res.json({msg:err,code:500})
  })

  

  //res.json({msg:"Successfully added to cart",code:200})
})

app.use((req,res)=> {
  res.render("error-page",{layout:"primary",login:req.session.loginState, showAdminInterface:req.session.AdminUser,cssFileName:"error-page.css"})
})

//-------ENDPOINTS-------


function onServerStart() {
    console.log("Express http server listening on: " + HTTP_PORT);
    console.log(`http://localhost:${HTTP_PORT}`);
  }

app.listen(HTTP_PORT, onServerStart);


