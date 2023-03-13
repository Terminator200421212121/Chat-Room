const form = document.querySelector("form");
const input = document.querySelector(".input");
const messages = document.querySelector(".messages");
const prefix = "!";

window.onload = function() {
  if(window.localStorage.getItem("username") == null) {
    var username = prompt("Enter your username:", "");
    while(window.localStorage.getItem("username") == null) {
      username = prompt("Enter your username:", "");
      window.localStorage.setItem("username", username);
    }
  } else {
    socket.on("connect", function() {
      socket.emit("get_user", window.localStorage.getItem("username"));

      socket.on("load_user", function(data) {
        if((data.kick == true) || (data.ban == true)) {
          if((data.kick == true) && (data.ban == false)) {
            while(data.kick != true) {
              window.location.pathname = "./Kick/kick.html";
            }
          } else if((data.kick == false) && (data.ban == true)) {
            while(data.ban != false) {
              window.location.pathname = "./Ban/ban.html";
            }
          }
        }
      });
    });
  }
  addJoinMessage(window.localStorage.getItem("username") + " has joined");
  socket.emit("user_join", window.localStorage.getItem("username"));
}

form.addEventListener("submit", function(event) {
  event.preventDefault();

  if(input.value.startsWith(prefix)) {
    var command = input.value.slice(prefix.length).trim().split(/ + /g);
    addCommandMessage(window.localStorage.getItem("username"), command);

    socket.emit("command_message", {
      username: window.localStorage.getItem("username"),
      command: command
    });
  } else {
    addMessage(window.localStorage.getItem("username"), input.value);

    socket.emit("chat_message", {
      username: window.localStorage.getItem("username"),
      message: input.value,
    });
  }
  input.value = "";
  return false;
});

socket.on("load_messages", function(data) {
  for(let i = 1; i < data.msgs + 1; i++) {
    if(data.messages[i][0] == "message") {
      addMessage(data.messages[i][1], data.messages[i][2]);
    } else if(data.messages[i][0] == "command") {
      addCommandMessage(data.messages[i][1], data.messages[i][2]);
    } else if(data.messages[i][0] == "system") {
      addSystemMessage(data.messages[i][2]);
    } else if(data.messages[i][0] == "join") {
      addJoinMessage(data.messages[i][2]);
    } else if(data.messages[i][0] == "leave") {
      addLeaveMessage(data.messages[i][2]);
    }
  }
});

socket.on("chat_message", function(data) {
  addMessage(data.username, data.message);
});

socket.on("command_message", function(data) {
  addCommandMessage(data.username, data.command);
})

socket.on("system_message", function(data) {
  addSystemMessage(data.message);
});

socket.on("user_join", function(data) {
  socket.emit("get_user", data);
  socket.on("load_user", function(sentuserdata) {
    if(!((sentuserdata.kick == true) || (sentuserdata.ban == true))) {
      addJoinMessage(data + " has joined");
    }
  });
});

socket.on("user_leave", function(data) {
  socket.emit("get_user", data);
  socket.on("load_user", function(sentuserdata) {
    if(!((sentuserdata.kick == true) || (sentuserdata.ban == true))) {
      addLeaveMessage(data + " has left");
    }
  });
});

socket.on("verify_code", function(data) {
  if(window.localStorage.getItem("username") == data.username) {
    var verification = prompt("Enter the verification code sent to you email:", "");
    while(verification == null) {
      verification = prompt("Enter the verification code sent to you email:", "");
    }
    var codedata = {
      user: data.username,
      code: data.code,
      usercode: verification
    }
    socket.emit("verify", codedata);
  }
});

socket.on("change_user", function(data) {
  if(window.localStorage.getItem("username") == data.old_user) {
    window.localStorage.setItem("username", data.new_user);
    var changedata = {
      old_user: data.old_user,
      new_user: data.new_user
    }
    socket.emit("changed_user", changedata);
  }
});

socket.on("kick", function(data) {
  if(window.localStorage.getItem("username") == data.user) {
    var kickuser = {
      user: data.user
    }
    socket.emit("kick_data", kickuser);
    socket.on("kick_send", function(kickuserdata) {
      if(kickuserdata.kick != false) {
        var timeArray = data.time.split(":");
        if(((parseInt(timeArray[0]) < 0) || (parseInt(timeArray[0]) >= 24)) || ((parseInt(timeArray[1]) < 0) || (parseInt(timeArray[1]) > 59)) || ((parseInt(timeArray[2]) < 0) || (parseInt(timeArray[2]) > 59))) {
          var kicktimedata = {
            message: "You need to provide a valid time to execute this commmand"
          }
          socket.emit("invalid_time", kicktimedata);
        } else {
          var time = (parseInt(timeArray[0]) * 3600000) + (parseInt(timeArray[1]) * 60000) + (parseInt(timeArray) * 1000);
          const reason = prompt("Enter the kick reason:", "");
          for(let i = 0; i < 3; i++) {
            if(timeArray[i].length < 2) {
              timeArray[i] = `0${timeArray[i]}`;
            }
          }
          var kickdata = {
            by: data.by,
            user: data.user,
            reason: reason,
            hours: timeArray[0],
            minutes: timeArray[1],
            seconds: timeArray[2]
          }
          socket.emit("kicked", kickdata);
        }
      }
    });
  }
});

socket.on("ban", function(data) {
  if(window.localStorage.getItem("username") == data.user) {
    var banuser = {
      user: data.user
    }
    socket.emit("ban_data", banuser);
    socket.on("ban_send", function(data) {
      if(banuserdata.ban != false) {
        const reason = prompt("Enter the kick reason:", "");
        var bandata = {
          by: data.by,
          user: data.user,
          reason: reason
        }
        socket.emit("banned", bandata);
      }
    });
  }
});

function addJoinMessage(message) {
  const data = {
    type: "join",
    message: message
  }
  const head = document.createElement("div");
  const div = document.createElement("div");
  const span = document.createElement("span");
  div.style.backgroundColor = "#00ffff";
  span.innerHTML = message;
  div.appendChild(span);
  head.appendChild(div);
  head.setAttribute("class", ".msg");
  messages.appendChild(head);
  window.scrollTo(0, document.body.scrollHeight);
  socket.emit("save_message", data);
}

function addLeaveMessage(message) {
  const data = {
    type: "leave",
    message: message
  }
  const head = document.createElement("div");
  const div = document.createElement("div");
  const span = document.createElement("span");
  div.style.backgroundColor = "#ff8484";
  span.innerHTML = message;
  div.appendChild(span);
  head.appendChild(div);
  head.setAttribute("class", ".msg");
  messages.appendChild(head);
  window.scrollTo(0, document.body.scrollHeight);
  socket.emit("save_message", data);
}

function addSystemMessage(message) {
  const data = {
    type: "system",
    username: "System",
    message: message
  }
  const div = document.createElement("div");
  const msg = document.createElement("div");
  const head = document.createElement("span");
  const br = document.createElement("br");
  const body = document.createElement("p");
  msg.style.backgroundColor = "#ffff00";
  head.innerHTML = "System";
  body.innerHTML = message;
  msg.appendChild(head);
  msg.appendChild(br);
  msg.appendChild(body);
  div.appendChild(msg);
  div.setAttribute("class", ".msg");
  messages.appendChild(div);
  window.scrollTo(0, document.body.scrollHeight);
  socket.emit("save_message", data);
}

function addCommandMessage(user, command) {
  var cmd = command.shift().toLowerCase();
  var message = `${user} has used !${cmd}`;
  const data = {
    type: "command",
    username: user,
    message: message,
  }
  const div = document.createElement("div");
  const msg = document.createElement("div");
  const head = document.createElement("span");
  const br = document.createElement("br");
  const body = document.createElement("p");
  msg.style.backgroundColor = "#0000ff";
  head.innerHTML = "Commands";
  body.innerHTML = message;
  msg.appendChild(head);
  msg.appendChild(br);
  msg.appendChild(body);
  div.appendChild(msg);
  div.setAttribute("class", ".msg");
  messages.appendChild(div);
  window.scrollTo(0, document.body.scrollHeight);
  socket.emit("save_message", data);
}

function addMessage(user, message) {
  const data = {
    type: "message",
    username: user,
    message: message
  }
  const div = document.createElement("div");
  const msg = document.createElement("div");
  const head = document.createElement("span");
  const br = document.createElement("br");
  const body = document.createElement("p");
  if (user == window.localStorage.getItem("username")) {
    msg.style.backgroundColor = "#00ff00";
  } else {
    msg.style.backgroundColor = "#beffbe";
  }
  head.innerHTML = user;
  body.innerHTML = message;
  msg.appendChild(head);
  msg.appendChild(br);
  msg.appendChild(body);
  div.appendChild(msg);
  div.setAttribute("class", ".msg");
  messages.appendChild(div);
  window.scrollTo(0, document.body.scrollHeight);
  socket.emit("save_message", data);
}