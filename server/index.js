const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { QuickDB } = require("quick.db");
const db1 = new QuickDB();
const db2 = new QuickDB();

db1.set("total_messages", 0);

var nodemailer = require("nodemailer");

var user = 1;
var users = 0;
var notify = false;

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;
const io = new Server(server);

app.use(express.static("public"));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "public/index.html");
});

io.on("connection", async function(socket) {
  if(await db1.get("total_messages") != 0) {
    const data = {
      msgs: await db1.get("total_messages"),
      messages: getMessages()
    }
    socket.emit("load_messages", data);
  }

  socket.on("user_join", async function(data) {
    if(db2.has(`User_${user}`) == false) {
      await db2.set(`User_${user}`, { user: data, permissions: "Member", verified: false, kick: false, ban: false });
      user += 1;
      users += 1;
    }
    this.username = data;
    socket.broadcast.emit("user_join", data);
    if(notify == true) {
      if(data != "JaimePRO200421212121") {
        var transporter1 = nodemailer.createTransport({
          service: "gamil",
          auth: {
            user: "developers.chat.room.verifier@gmail.com",
            pass: "developers-chat-room"
          }
        });
        var mailoptions1 = {
          from: "developers.chat.room.verifier@gmail.com",
          to: "jaimepro200421212121@gmail.com",
          subject: "User join",
          text: `User ${data} has joined`
        }
        transporter1.sendMail(mailoptions1, function(error, info) {
          if(error) {
            console.log(error);
          } else {
            console.log(`Email sent: ${info.response}`);
          }
        });
      }
    }
  });

  socket.on("get_user", async function(data) {
    for(var i = 1; i < users + 1; i++) {
      if(await db2.get(`User_${i}`)["user"] == data) {
        var userinfo = {
          verified: await db2.get(`User_${i}.verified`),
          kick: await db2.get(`User_${i}.kick`),
          ban: await db2.get(`User_${i}.ban`)
        }
        socket.broadcast.emit("load_user", userinfo);
        break;
      }
    }
  });

  socket.on("command_message", async function(data) {
    var commandinfodata = {
      username: data.username,
      command: data.command
    }
    socket.broadcast.emit("command_message", commandinfodata);

    if(data.command == "admin") {
      if(data.arg1 == "add") {
        if(data.arg2 != null) {
          if(getPermissions(data.username) == "Admin") {
            await db2.set(`${data.arg2}`, { permissions: "Admin" });
            systemMessage(socket, `Set ${data.arg2} permissions to 'Admin'`);
          } else {
            systemMessage(socket, "You don't have permission to use this command");
          }
        } else {
          systemMessage(socket, "Username not found");
          systemMessage(socket, "You must provide a username to execute this command");
        }
      } else if(data.arg1 == "remove") {
        if(data.arg2 != null) {
          if(getPermissions(data.username) == "Admin") {
            await db2.set(`${data.arg2}`, { permissions: "Member" });
            systemMessage(socket, `Set ${data.arg2} permissions to 'Member'`);
          } else {
            systemMessage(socket, "You don't have permission to use this command");
          }
        } else {
          systemMessage(socket, "Username not found");
          systemMessage(socket, "You must provide a username to execute this command");
        }
      } else if(data.arg1 == "verify") {
        var code = generateCode();
        var transporter2 = nodemailer.createTransport({
          service: "gamil",
          auth: {
            user: "developers.chat.room.verifier@gmail.com",
            pass: "developers-chat-room"
          }
        });
        var mailoptions2 = {
          from: "developers.chat.room.verifier@gmail.com",
          to: "jaimepro200421212121@gmail.com",
          subject: "Verification code",
          text: `Your verification code: ${code}`
        }
        transporter2.sendMail(mailoptions2, function(error, info) {
          if(error) {
            console.log(error);
          } else {
            console.log(`Email sent: ${info.response}`);
          }
        });
        var codedata = {
          username: "JaimePRO200421212121",
          code: code
        }
        socket.broadcast.emit("verify_code", codedata);
      }
    } else if(data.command == "changeuser") {
      if(data.arg1 != null) {
        if(data.arg2 != null) {
          var userdata = {
            old_user: data.arg1,
            new_user: data.arg2
          }
          socket.broadcast.emit("change_user", userdata);
          var found = false;
          for(var i = 0; i < users; i++) {
            if(await db2.get(`User_${i}.user`) == data.arg1) {
              await db2.set(`User_${i}`, { user: data.arg2 });
              found = true;
              break;
            }
          }
          if(found == false) {
            systemMessage(socket, "User not found");
          }
        } else {
          systemMessage(socket, "You must provide the new username to execute this command");
        }
      } else {
        systemMessage(socket, "You must provide your both old and new username to execute this command");
      }
    } else if(data.command == "kick") {
      if(getPermissions(data.username) == "Admin") {
        if(data.arg1 != null) {
          if(data.arg2 != null) {
            var kickdata = {
              by: data.username,
              user: data.arg1,
              time: data.arg2
            }
            socket.broadcast.emit("kick", kickdata);
            await db2.set(data.arg1, { kick: true });
          } else {
            systemMessage(socket, "You need to provide the kick time to execute this command");
          }
        } else {
          systemMessage(socket, "You need to provide a username to execute this command");
        }
      } else {
        systemMessage(socket, "You don't have permission to use this command");
      }
    } else if(data.command == "ban") {
      if(getPermissions(data.username) == "Admin") {
        if(data.arg1 != null) {
          var bandata = {
            by: data.username,
            user: data.arg1
          }
          socket.broadcast.emit("ban", bandata);
          await db2.set(data.arg1, { ban: true });
        } else {
          systemMessage(socket, "You need to provide a username to execute this command");
        }
      } else {
        systemMessage(socket, "You don't have permission to use this command");
      }
    } else if(data.command == "unkick") {
      if(getPermissions(data.username) == "Admin") {
        if(data.arg1 != null) {
          var unkickdata = {
            by: data.username,
            user: data.arg1
          }
          socket.broadcast.emit("unkick", unkickdata);
          await db2.set(data.arg1, { kick: false });
        } else {
          systemMessage(socket, "You have to provide a username to execute this command");
        }
      } else {
        systemMessage(socket, "You don't have permission to use this command");
      }
    } else if(data.command == "unban") {
      if(getPermissions(data.username) == "Admin") {
        if(data.arg1 != null) {
          var unbandata = {
            by: data.username,
            user: data.arg1
          }
          socket.broadcast.emit("unban", unbandata);
          await db2.set(data.arg1, { ban: false });
        } else {
          systemMessage(socket, "You have to provide a username to execute this command");
        }
      } else {
        systemMessage(socket, "You don't have permission to use this command");
      }
    } else if(data.command == "notify") {
      if(data.arg1 != null) {
        if(data.arg1 == "on") {
          notify = true;
          systemMessage(socket, "User joins will be notified to the owner via e-mail");
        } else if(data.arg1 == "off") {
          notify = false;
          systemMessage(socket, "User joins won't be notified to the owner via e-mail");
        } else {
          systemMessage(socket, "Unknown state");
        }
      } else {
        systemMessage(socket, "You have to provide a state to execute this command");
      }
    } else if(data.command == "help") {
      systemMessage(socket, "Commands:");
      systemMessage(socket, "admin [Options]:");
      systemMessage(socket, "Option 'add [User]': User becomes Admin");
      systemMessage(socket, "Option 'remove User]': User becomes Member");
      systemMessage(socket, "Option 'verify': Verifies the owner via verification e-mail"); 
      systemMessage(socket, "changeuser: Changes your username");
      systemMessage(socket, "kick [User|Reason|Time]: Kicks User for Time due to Reason");
      systemMessage(socket, "ban [User|Reason]: Bans User due to Reason");
      systemMessage(socket, "unkick [User]: Unkicks User");
      systemMessage(socket, "unban [User]: Unbans User");
      systemMessage(socket, "notify [State]:");
      systemMessage(socket, "State 'on': Enables user join notifications via e-mail");
      systemMessage(socket, "State 'off': Disables user join notifications via e-mail");
      systemMessage(socket, "help: Shows the command list");
    } else {
      systemMessage(socket, "Unknown command");
    }
  });

  socket.on("chat_message", function(data) {
    data.username = this.username;
    socket.broadcast.emit("chat_message", data);
  });

  socket.on("disconnect", function(data) {
    socket.broadcast.emit("user_leave", this.username);
  });

  socket.on("save_message", function(data) {
    saveMessage(data);
  });

  socket.on("verify", async function(data) {
    if(data.usercode == data.code) {
      await db2.set(data.username, { verified: true });
      var verifydata = {
        user: "JaimePRO200421212121"
      }
      systemMessage(socket, "JaimePRO200421212121 has been verified");
      systemMessage(socket, "Now JaimePRO200421212121 is Admin");
    } else {
      systemMessage(socket, "Verification failed");
      systemMessage(socket, "Please try again later");
    }
  });

  socket.on("admin_done", function(data) {
    var admindata = {
      message: `Set ${data} permissions to 'Admin'`
    }
    socket.broadcast.emit("system_message", admindata);
  });

  socket.on("member_done", function(data) {
    var memberdata = {
      message: `Set ${data} permissions to 'Member'`
    }
    socket.broadcast.emit("system_message", memberdata);
  });

  socket.on("changed_user", function(data) {
    var changedata = {
      message: `User ${data.old_user} has changed his/her username to ${data.new_user}`
    }
    socket.emit("system_message", changedata);
  });

  socket.on("kick_data", async function(data) {
    var kickuser = {
      kick: await db2.get(`${data.user}.kick`)
    }
    socket.broadcast.emit("kick_send", kickuser);
  });

  socket.on("kicked", function(data) {
    var kickmsgdata = {
      message: `User ${data.user} has been kicked by ${data.by} for ${data.hours}h ${data.minutes}m ${data.seconds}s due to ${data.reason}`
    }
    socket.broadcast.emit("system_message", kickmsgdata);
    var kickinfodata = {
      user: data.user,
      by: data.by,
      reason: data.reason,
      time: `${data.hours}h ${data.minutes}m ${data.seconds}s`,
      totaltime: data.time
    }
    socket.broadcast.emit("kick_info", kickinfodata);
  });

  socket.on("time_out", async function(data) {
    await db2.set(data.user, { kick: false });
    var joindata = {
      message: data.message
    }
    socket.broadcast.emit("system_message", joindata);
  });

  socket.on("ban_data", async function(data) {
    var banuser = {
      ban: await db2.get(`${data.user}.ban`)
    }
    socket.broadcast.emit("ban_send", banuser);
  });

  socket.on("banned", function(data) {
    var banmsgdata = {
      message: `User ${data.user} has been banned by ${data.by} due to ${data.reason}`
    }
    socket.broadcast.emit("system_message", banmsgdata);
    var baninfodata = {
      user: data.user,
      by: data.by,
      reason: data.reason
    }
    socket.broadcast.emit("ban_info", baninfodata);
  });

  socket.on("unkicked", async function(data) {
    await db2.set(data.user, {kick: false });
    var unkickmsgdata = {
      message: `User $${data.user} has been unkicked by ${data.by}`
    }
    socket.emit("system_message", unkickmsgdata);
  });

  socket.on("unbanned", async function(data) {
    await db2.set(data.user, {ban: false });
    var unbanmsgdata = {
      message: `User $${data.user} has been unbanned by ${data.by}`
    }
    socket.emit("system_message", unbanmsgdata);
  });
});

server.listen(port, function() {
  console.log("Listening on port: " + port);
});

async function getPermissions(username) {
  var permissions = "";
  for(var i = 1; i < users + 1; i++) {
    if(await db2.get(`User_${i}`)["user"] == username) {
      permissions = await db2.get(`User_${i}`)["permissions"];
      break;
    }
  }
  return permissions;
}

async function getMessages() {
  var messages = [];
  var data = [];
  for(let i = 1; i < await db1.get("total_messages") + 1; i++) {
    data.push(await db1.get(`message_${i}.type`));
    data.push(await db1.get(`message_${i}.username`));
    data.push(await db1.get(`message_${i}.message`));
    messages.push(data);
  }
  return messages;
}

async function saveMessage(data) {
  await db1.add("total_messages", 1);
  if(data.type == "message") {
    await db1.set(`message_${await db1.get("total_messages")}`, { type: data.type, username: data.username, message: data.message });
  } else if(data.type == "command") {
    await db1.set(`message_${await db1.get("total_messages")}`, { type: data.type, username: data.username, message: data.message });
  } else if(data.type == "system") {
    await db1.set(`message_${await db1.get("total_messages")}`, { type: data.type, username: data.username, message: data.message });
  } else if(data.type == "join") {
    await db1.set(`message_${await db1.get("total_messages")}`, { type: data.type, username: null, message: data.message });
  } else if(data.type == "leave") {
    await db1.set(`message_${await db1.get("total_messages")}`, { type: data.type, username: null, message: data.message });
  }
}

function systemMessage(socket, message) {
  var msgdata = {
    message: message
  }
  socket.broadcast.emit("system_message", msgdata);
}

function generateCode() {
  var key = "";
  var numbers = "0123456789";
  for(let i = 0; i < 5; i++) {
    key += numbers[Math.random() * numbers.length];
  }
  return key;
}