import { jsx } from "hono/jsx";

const Home = ({ botStatus }) => {
  return (
    <html>
      <head>
        <title>SakuraBot Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 min-h-screen p-8">
        <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
          <h1 class="text-3xl font-bold mb-6 text-center text-pink-600">SakuraBot Dashboard</h1>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="border rounded-lg p-4 bg-gray-50">
              <h2 class="text-xl font-semibold mb-2 flex items-center">
                <span class="mr-2">WhatsApp Bot</span>
                <span class={`inline-block w-3 h-3 rounded-full ${botStatus.wa ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </h2>
              <p class="text-gray-600 mb-4">Status: <span class={`font-bold ${botStatus.wa ? 'text-green-600' : 'text-red-600'}`}>${botStatus.wa ? 'Active' : 'Inactive'}</span></p>
              <div class="flex space-x-2">
                <form action="/wa/start" method="POST">
                  <button type="submit" disabled={botStatus.wa} class="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50 hover:bg-green-600 transition">Start</button>
                </form>
                <form action="/wa/stop" method="POST">
                  <button type="submit" disabled={!botStatus.wa} class="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50 hover:bg-red-600 transition">Stop</button>
                </form>
              </div>
            </div>

            <div class="border rounded-lg p-4 bg-gray-50">
              <h2 class="text-xl font-semibold mb-2 flex items-center">
                <span class="mr-2">Telegram Bot</span>
                <span class={`inline-block w-3 h-3 rounded-full ${botStatus.tg ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </h2>
              <p class="text-gray-600 mb-4">Status: <span class={`font-bold ${botStatus.tg ? 'text-green-600' : 'text-red-600'}`}>${botStatus.tg ? 'Active' : 'Inactive'}</span></p>
              <div class="flex space-x-2">
                <form action="/tg/start" method="POST">
                  <button type="submit" disabled={botStatus.tg} class="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 hover:bg-blue-600 transition">Start</button>
                </form>
                <form action="/tg/stop" method="POST">
                  <button type="submit" disabled={!botStatus.tg} class="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50 hover:bg-red-600 transition">Stop</button>
                </form>
              </div>
            </div>
          </div>

          <div class="mt-8 text-center text-sm text-gray-500">
            <p>System Uptime: ${global.tools.utils.formatUptime(global.botStartTime)}</p>
          </div>
        </div>
      </body>
    </html>
  );
};

export default Home;
