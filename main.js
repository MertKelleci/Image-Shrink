const path = require("path");
const os = require("os");
const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const imagemin = require("imagemin");
const imageminPngquant = require("imagemin-pngquant");
const slash = require("slash");
const log = require("electron-log");

let mainWindow;
process.env.NODE_ENV = "production";

const isDev = process.env.NODE_ENV !== "production" ? true : false;
const menu = [
  {
    // label: "File",
    // submenu: [
    //   {
    //     label: "Quit",
    //     accelerator: "CmdOrCtrl+W",
    //     click: () => app.quit(),
    //   },
    // ],

    role: "fileMenu",
  },
  ...(isDev
    ? [
        {
          label: "Developer",
          submenu: [
            { role: "reload" },
            { role: "forcereload" },
            { type: "separator" },
            { role: "toggledevtools" },
          ],
        },
      ]
    : []),
];

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "Image Shrink",
    width: 500,
    height: 600,
    // icon: `${__dirname}/assets`
    resizable: isDev,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  //   mainWindow.loadURL(`file://${__dirname}/app/index.html`);
  mainWindow.loadFile("./app/index.html");
}

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on("ready", () => {
  createMainWindow();
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);
  //   globalShortcut.register("CmdOrCtrl+R", () => mainWindow.reload());
  //   globalShortcut.register("Ctrl+Shift+I", () => mainWindow.toggleDevTools());

  mainWindow.on("closed", () => (mainWindow = null));
});

ipcMain.on("image:minimize", (e, options) => {
  options.dest = path.join(os.homedir(), "imageshrink");
  shrinkImage(options);
});

async function shrinkImage({ imgPath, quality, dest }) {
  import("imagemin-mozjpeg").then(async (imageminMozjpeg) => {
    try {
      const pngQuality = quality / 100;
      const files = await imagemin([slash(imgPath)], {
        destination: dest,
        plugins: [
          imageminMozjpeg.default({ quality }),
          imageminPngquant({
            quality: [pngQuality, pngQuality],
          }),
        ],
      });

      log.info(files);
      shell.openPath(dest);

      mainWindow.webContents.send("image:done");
    } catch (err) {
      log.error(err);
    }
  });
}
