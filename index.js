const Pusher = require("pusher");

const pusher = new Pusher({
  appId: "2004792",
  key: "5c6d93290538e3d2fbda",
  secret: "048602b30ec836088197",
  cluster: "us2",
  useTLS: true
});

pusher.trigger("my-channel", "my-event", {
  message: "hello world"
});
