
//=======================================================================================================
//USER SESSION MANAGEMENT

exports.userIsLoggedIn = async(req,res,next)=>{
  try{
    if (req.session.userIsLoggedIn) {
    
      next()
    } else {
      res.render('user/login' ,{ isAdminLogin: true }); // Redirect to login if session is missing
    }
  } catch(error){
    console.error(error) 
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

  
  exports.userIsLoggedOut = async (req, res, next) => {
    try{
      if (req.session.userIsLoggedIn) {
        res.render('user/home'); 
        
        } else {
          next(); // User is not logged in, proceed to the next middleware
        }
    } catch(error){
      console.error(error) 
      res.status(500).json({ error: 'Internal Server Error' })
    }
  };

//=======================================================================================================
//ADMIN SESSION MANAGEMENT


  exports.adminIsLoggedIn = async(req,res,next)=>{
    try{
      if (req.session.adminIsLoggedIn) {
      
        next()
      } else {
        res.render('admin/login' ,{ isAdminLogin: true }); // Redirect to login if session is missing
      }
    } catch(error){
      console.error(error) 
      res.status(500).json({ error: 'Internal Server Error' })
    }
  }
  
    
    exports.adminIsLoggedOut = async (req, res, next) => {
      try{
        if (req.session.adminIsLoggedIn) {
          res.render('admin/dashboard' , { admin: true }); 
          
          } else {
            next(); // User is not logged in, proceed to the next middleware
          }
      } catch(error){
        console.error(error) 
        res.status(500).json({ error: 'Internal Server Error' })
      }
    };