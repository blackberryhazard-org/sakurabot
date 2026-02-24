const { Hono } = require("hono");
const { serve } = require("@hono/node-server");
const Home = require("./components/Home.jsx").default;

const app = new Hono();

app.get("/", (c) => {
    return c.html(<Home botStatus={global.botStatus} />);
});

app.post("/wa/start", async (c) => {
    if (!global.botStatus.wa) {
        await global.botManagers.startWa();
    }
    return c.redirect("/");
});

app.post("/wa/stop", async (c) => {
    if (global.botStatus.wa) {
        await global.botManagers.stopWa();
    }
    return c.redirect("/");
});

app.post("/tg/start", async (c) => {
    if (!global.botStatus.tg) {
        await global.botManagers.startTg();
    }
    return c.redirect("/");
});

app.post("/tg/stop", async (c) => {
    if (global.botStatus.tg) {
        await global.botManagers.stopTg();
    }
    return c.redirect("/");
});

const startDashboard = (port) => {
    serve({
        fetch: app.fetch,
        port: port
    }, (info) => {
        global.consolefy.success(`Web Dashboard is running on port ${info.port}`);
    });
};

module.exports = { startDashboard };
