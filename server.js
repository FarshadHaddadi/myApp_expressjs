// https://nameless-meadow-25265.herokuapp.com/

var express = require("express");
var app = express();
var path = require("path");
var clientSessions = require("client-sessions");
var dataService = require("./data-service.js");
const dataServiceComments = require("./data-service-comments.js");
const dataServiceAuth = require("./data-service-auth.js");
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');

var HTTP_PORT = process.env.PORT || 8080;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Setup client-sessions
app.use(clientSessions({
  cookieName: "session", // this is the object name that will be added to 'req'
  secret: "web322_A7", // this should be a long un-guessable string.
  duration: 2 * 60 * 1000, // duration of the session in milliseconds (2 minutes)
  activeDuration: 1000 * 60 // the session will be extended by this many ms each request (1 minute)
}));

// custom middleware to add "session" to all views (res)
app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

// This is a helper middleware function that checks if a user is logged in
// we can use it in any route that we want to protect against unauthenticated access.
// A more advanced version of this would include checks for authorization as well after
// checking if the user is authenticated
function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

app.engine(".hbs", exphbs({
  extname: ".hbs",
  defaultLayout: 'layout',
  helpers: {
    equal: function (lvalue, rvalue, options) {
      if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters");
      if (lvalue != rvalue) {
        return options.inverse(this);
      } else {
        return options.fn(this);
      }
    }
  }
}));
app.set("view engine", ".hbs");

// call this function after the http server starts listening for requests
function onHttpStart() {
  console.log("Express http server listening on: " + HTTP_PORT);
}

// setup a 'route' to listen on the default url path (http://localhost)
app.get("/", (req, res) => {
  res.render("home");
});

// setup another route to listen on /about
app.get("/about", (req, res) => {

  dataServiceComments.getAllComments().then((data) => {
    res.render("about", { data: data });
  }).catch((err) => {
    res.render("about");
  });

});

app.get("/employees",ensureLogin,(req, res) => {

  if (req.query.status) {
    dataService.getEmployeesByStatus(req.query.status).then((data) => {
      res.render("employeeList", { data: data, title: "Employees" });
    }).catch((err) => {
      res.render("employeeList", { data: {}, title: "Employees" });
    });

  } else if (req.query.department) {
    dataService.getEmployeesByDepartment(req.query.department).then((data) => {
      res.render("employeeList", { data: data, title: "Employees" });
    }).catch((err) => {
      res.render("employeeList", { data: {}, title: "Employees" });
    });


  } else if (req.query.manager) {
    dataService.getEmployeesByManager(req.query.manager).then((data) => {
      res.render("employeeList", { data: data, title: "Employees" });
    }).catch((err) => {
      res.render("employeeList", { data: {}, title: "Employees" });
    });

  } else {
    dataService.getAllEmployees().then((data) => {
      res.render("employeeList", { data: data, title: "Employees" });
    }).catch((err) => {
      res.render("employeeList", { data: {}, title: "Employees" });
    });
  }

});



app.get("/employee/:empNum",ensureLogin, (req, res) => {

  // initialize an empty object to store the values
  let viewData = {};

  dataService.getEmployeeByNum(req.params.empNum)
    .then((data) => {
      viewData.data = data; //store employee data in the "viewData" object as "data"
    }).catch(() => {
      viewData.data = null; // set employee to null if there was an error 
    }).then(dataService.getDepartments)
    .then((data) => {
      viewData.departments = data; // store department data in the "viewData" object as "departments"

      // loop through viewData.departments and once we have found the departmentId that matches
      // the employee's "department" value, add a "selected" property to the matching 
      // viewData.departments object

      for (let i = 0; i < viewData.departments.length; i++) {
        if (viewData.departments[i].departmentId == viewData.data.department) {
          viewData.departments[i].selected = true;
        }
      }

    }).catch(() => {
      viewData.departments = []; // set departments to empty if there was an error
    }).then(() => {
      if (viewData.data == null) { // if no employee - return an error
        res.status(404).send("Employee Not Found");
      } else {
        res.render("employee", { viewData: viewData }); // render the "employee" view
      }
    });
});

app.get("/employee/delete/:empNum",ensureLogin, (req, res) => {
  dataService.deleteEmployeeByNum(req.params.empNum).then(() => {
    res.redirect("/employees");
  }).catch((err) => {
    res.status(500).send("Unable to Remove Employee / Employee Not Found");
  });
});


app.get("/managers",ensureLogin, (req, res) => {

  dataService.getManagers().then((data) => {
    res.render("employeeList", { data: data, title: "Employees (Managers)" });
  }).catch((err) => {
    res.render("employeeList", { data: {}, title: "Employees (Managers)" });
  });

}); 

app.get("/departments",ensureLogin, (req, res) => {

  dataService.getDepartments().then((data) => {
    res.render("departmentList", { data: data, title: "Departments" });
  }).catch((err) => {
    res.render("departmentList", { data: {}, title: "Departments" });
  });

});

app.get("/employees/add",ensureLogin, (req, res) => {

  dataService.getDepartments().then((data) => {
    res.render("addEmployee", { departments: data });
  }).catch((err) => {
    // set department list to empty array
    res.render("addEmployee", { departments: [] });
  });
});

app.post("/employees/add",ensureLogin, (req, res) => {
  dataService.addEmployee(req.body).then(() => {
    res.redirect("/employees");
  });
});

app.get("/departments/add",ensureLogin, (req, res) => {
  res.render("addDepartment");
});

app.post("/departments/add",ensureLogin, (req, res) => {
  dataService.addDepartment(req.body).then(() => {
    res.redirect("/departments");
  });
});

app.post("/employee/update",ensureLogin, (req, res) => {
  dataService.updateEmployee(req.body).then(() => {
    res.redirect("/employees");
  });

});

app.post("/department/update",ensureLogin, (req, res) => {
  dataService.updateDepartment(req.body).then(() => {
    res.redirect("/departments");
  });
});

app.get("/department/:departmentId",ensureLogin, (req, res) => {

  dataService.getDepartmentById(req.params.departmentId).then((data) => {
    res.render("department", { data: data });
  }).catch((err) => {
    res.status(404).send("Department Not Found");
  });
});

app.post("/api/updatePassword", ensureLogin, (req,res)=>{

  dataServiceAuth.checkUser({ user: req.body.user, password: req.body.currentPassword }).then(() => {
    dataServiceAuth.updatePassword(req.body).then(() => {
      res.json({successMessage: "Password changed successfully for user: " + req.body.user})
    }).catch((err) => {
      res.json({ errorMessage: err });
    });
  }).catch((err) => {
    res.json({ errorMessage: err });
  });


});

app.post("/about/addComment", (req,res)=>{
    dataServiceComments.addComment(req.body).then(()=>{
        res.redirect("/about");
    }).catch((err)=>{
        console.log(err);
        res.redirect("/about");
    });
});

app.post("/about/addReply", (req,res)=>{
  dataServiceComments.addReply(req.body).then(()=>{
        res.redirect("/about");
    }).catch((err)=>{
        console.log(err);
        res.redirect("/about");
    });
});

app.get("/login", (req,res)=>{
  res.render("login");
});

app.get("/register", (req,res)=>{
  res.render("register");
});

app.post('/register', (req,res)=>{
  dataServiceAuth.registerUser(req.body).then(()=>{
    res.render("register", {successMessage: "User created"});
  }).catch((err)=>{
    res.render("register", {errorMessage: err, user: req.body.user});
  });
  
});

app.post("/login", (req, res) => {

  dataServiceAuth.checkUser(req.body).then(() => {

    req.session.user = {
      username: req.body.user
    }

    res.redirect('/employees');
  }).catch((err) => {
    res.render("login", {errorMessage: err, user: req.body.user});
  });
});

app.get("/logout", (req,res)=>{
  req.session.reset();
  res.redirect('/');
})

app.use((req, res) => {
  res.status(404).send("Page Not Found");
});




dataService.initialize()
.then(dataServiceComments.initialize)
.then(dataServiceAuth.initialize)
.then(()=>{
  app.listen(HTTP_PORT, onHttpStart);
})
.catch((err)=>{
  console.log("unable to start the server: " + err);
});


















   


