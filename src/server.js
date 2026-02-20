const app = require("./app");

const defaultPort = 3000;
const parsedPort = Number(process.env.PORT);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : defaultPort;

app.listen(port, () => {
  console.log(`Redirect service is listening on port ${port}`);
});
