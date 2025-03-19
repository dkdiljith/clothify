const User = require("../models/userSchema");
const Address = require(`../models/addressSchema`)
const Product = require(`../models/productSchema`)
const Order = require(`../models/orderSchema`)
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto")



//=======================//SECURITY FUNCTIONS // Other Used Services====================================

//secure password
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (err) {
    console.log(err);
  }
};

//phone number validation
const validatePhoneStartsWithPlus91 = async (phone) => {
  try {
    if (typeof phone !== "string") {
      throw new Error("Invalid input: phone number must be a string.");
    }

    phone = phone.trim();

    if (!phone.startsWith("+91")) {
      if (phone.startsWith("91")) {
        phone = `+${phone}`;
      } else if (phone.startsWith("0")) {
        phone = `+91${phone.slice(1)}`;
      } else {
        phone = `+91${phone}`;
      }
    }

    return phone;
  } catch (err) {
    console.error("Error while validating the phone number:", err);
    throw err;
  }
};

//email verification
const verificationEmailSend = async (email, verificationToken) => {
  try {
    require("dotenv").config();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "clothifyfashionshop@gmail.com",
        pass: "tjyu mduy epba oyzk",
      },
    });

    const mailOptions = {
      from: "clothifyfashionshop@gmail.com",
      to: email,
      subject: "Email Verification Code",
      text: `Your Email verification code is: ${verificationToken}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", info.response); // Log success
  } catch (error) {
    console.error("Error sending email:", error); // Log error
    return { success: false, message: "Failed to send email", error };
  }
};




// ======================================================================================================
//GET METHODS / RENDERING PAGES

exports.indexRender = async (req, res) => {
  res.render("user/index", { isAdminLogin: true });
};

exports.homeRender = async (req, res) => {
  const product = await Product.find().lean()
  res.render(`user/home`, {
    product: product
  })
}

exports.mensRender = async (req, res) => {
  const product = await Product.find({ gender: 'Men' }).lean();
  res.render('user/mens', {
    product: product
  })
}

exports.womensRender = async (req, res) => {
  const product = await Product.find({ gender: 'Women' }).lean();
  res.render('user/womens', {
    product: product
  })
}





























//profile page
exports.profileRender = async (req, res) => {
  const userId = res.locals.user.id
  const userData = await User.findById(userId).lean()
  const address = await Address.findOne({ userId: userId, isDefault: true }).lean();
  res.render(`user/profileView`, { userData: userData, address: address })
}

exports.profileEditRender = async (req, res) => {
  const userId = res.locals.user.id
  const userData = await User.findById(userId).lean()
  res.render(`user/profileEdit`, { userData: userData })
}

exports.addressRender = async (req, res) => {
  try {
    const userId = res.locals.user.id;
    const addresses = await Address.find({ userId }).lean(); 
    res.render('user/address', { addresses: addresses }); 
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

exports.editAddressRender = async (req, res) => {
  const addressId = req.params.id
  const address = await Address.findById(addressId).lean()
  res.render(`user/editAddress`, { address: address })
}

exports.setDefaultAddress = async (req, res) => {
  const addressId = req.params.id;
  const userId = req.session.userIsLoggedIn.id

  try {

    await Address.updateMany(
      { userId: userId },
      { $set: { isDefault: false } }
    );


    await Address.findByIdAndUpdate(
      addressId,
      { $set: { isDefault: true } },
      { new: true } 
    );

    res.redirect('/user/address'); 
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).send('Server error');
  }
};
exports.deleteAddress = async (req, res) => {
  const addressId = req.params.id
  await Address.findByIdAndDelete(addressId).lean()
  res.redirect(`/user/address`)
}

exports.editAddress = async (req, res) => {
  const addressId = req.params.id;
  const { name, streetAddress, landmark, city, state, zip, country, phone } = req.body;

  try {
    await Address.findByIdAndUpdate(addressId, {
      name,
      streetAddress,
      landmark,
      city,
      state,
      zip,
      country,
      phone
    });
    res.redirect('/user/address');
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).send('Server Error');

  }
}


exports.addAddressRender = async (req, res) => {
  res.render(`user/addAddress`)
}

exports.deleteUserRender = async (req, res) => {
  res.render(`user/deleteAccount`)
}

exports.deleteUser = async (req, res) => {
  req.session.destroy()
  let userId = res.locals.user.id
  await User.findByIdAndDelete(userId)
  res.redirect(`/user`)
}

exports.userOrders = async(req,res)=>{
  const userId = req.session.userIsLoggedIn.id;
  const orders = await Order.find({userId:userId}).lean()
  res.render('user/userOrders' , {orders:orders})
}

exports.userOrderDetails = async(req,res)=>{

  const orderId = req.params.orderId;
  const itemId = req.params.itemId;

  const order = await Order.findById(orderId).lean();

  const item = await order.items.find((item)=>
    item._id.toString() === itemId
  )
  // console.log("item", item);
  

  res.render(`user/orderDetails` ,{order:order, item:item})
}








exports.profileEdit = async (req, res) => {

  try {
    const { name, phone, gender, dateOfBirth } = req.body;
    const userId = res.locals.user.id

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        phone,
        gender,
        dateOfBirth,
      },
      { new: true } 
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = await User.findById(userId).lean()

    res.render('user/profileView', { userData: user }); 

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}

exports.addAddress = async (req, res) => {
  try {
    const { streetAddress, landmark, city, state, zip, country, phone, name } = req.body;
    const userId = req.session.userIsLoggedIn.id
    const addresses = await Address.find({ userId: userId }).lean()

    const isFirstAddress = addresses.length === 0;
    const newAddress = new Address({
      userId, 
      name,
      streetAddress,
      landmark,
      city,
      state,
      zip,
      country,
      phone,
      isDefault: isFirstAddress || isFirstAddress
    });

    await newAddress.save();
    const address = await Address.find({ userId: userId }).lean()

    res.render('user/address', { addresses: address });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}






exports.registerRender = async (req, res) => {
  res.render("user/register", { isAdminLogin: true });
};

exports.loginRender = async (req, res) => {
  res.render("user/login", { isAdminLogin: true });
};

exports.forgetPasswordRender = async (req, res) => {
  res.render("user/forgetPassword", { isAdminLogin: true });
};

exports.userLogout = async (req, res) => {
  req.session.destroy()
  res.redirect(`/user/login`)
}

//========================================================================================================
//POST METHODS



exports.register = async (req, res) => {
  const passwordHash = await securePassword(req.body.password);
  const validatePhone = await validatePhoneStartsWithPlus91(req.body.phone);


  const verificationToken = crypto.randomBytes(3).toString("hex");

  const tokenExpiration = Date.now() + 3600000;

  const user = new User({
    name: req.body.name,
    phone: validatePhone,
    email: req.body.email,
    password: passwordHash,
    verificationToken: verificationToken,
    verificationTokenExpires: tokenExpiration,
    isVerified: false,
  });

  const existingUser = await User.findOne({ email: req.body.email })
  if (existingUser) {

    res.render(`user/register`, { message: "Email is already registered", isAdminLogin: true });

  } else {
    let result = await user.save();
    if (result) {
      await verificationEmailSend(req.body.email, verificationToken);
      res.render("user/emailVerification", { isAdminLogin: true });
      userData = result
    }

  }

};




exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const checkPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (checkPassword) {
      req.session.userIsLoggedIn = ({
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        blocked: user.blocked
      })

      res.render("user/home");
    } else {
      res.render("user/login", { message: "Invalid Email or Password", isAdminLogin: true });
    }
  }
};



exports.emailVerification = async (req, res) => {
  try {
    const { email } = userData;

    const user = await User.findOne({
      email: email,
      verificationToken: req.body.verificationCode,
      verificationTokenExpires: { $gt: Date.now() }, 
    });

    if (!user) {
      res.status(400).render("user/emailVerification", {
        message: "Invalid or expired verification token. Please try again.",
        isAdminLogin: false,
      });
    } else if (user) {

  
      user.isVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpires = null;

      await user.save();

    }
    req.session.userIsLoggedIn = ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      blocked: user.blocked
    })


    res.render("user/home");
  } catch (error) {
    console.error("Error during email verification:", error);

    
    res.status(500).render("error", {
      message: "An error occurred during email verification. Please try again.",
      error: error.message,
    });
  }
};




exports.showUsers = async (req, res) => {  
  try {
    const user = await User.find().lean(); 


    res.render('admin/usersList', {
      admin: true, 
      user: user
    });

  } catch (error) {
    console.error("Error fetching products:", error);
    res.render('admin/usersList', {
      admin: true,
      user: [], 
      errorMessage: "Error fetching products. Please try again later." 
    });
  }
}


exports.blockUser = async (req, res) => {
  try {
    console.log("Received ID from URL:", req.params.id);

    const userId = req.params.id; // Should get the ID here

    const user = await User.findById(userId); // Use the received userId

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Toggle blocked status
    user.blocked = !user.blocked;
    await user.save();
    res.redirect('/admin/userslist');
  } catch (error) {
    console.error("Error in blocking user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
