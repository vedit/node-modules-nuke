# Node Modules Nuke

Because your disk space is finite, but dependency trees apparently aren't.

This is a simple Electron app that finds `node_modules` folders hiding in your system, tells you how much space they're wasting, and lets you delete them. You know, so you can have a clean slate before running `npm install` and filling it strictly back up again 10 minutes later.

## Features

- **Scan**: Crawls your directories. It might take a while. Filesystems are big.
- **Review**: Sorts folders by size, so you can see which side project from 2019 is hoarding the most logic.
- **Delete**: Removes selected folders. Gone. Poof. Until you need them again.

## How to use

1. Open the app.
2. Select a directory to scan.
3. Wait.
4. Select the folders you want to delete.
5. Click the button.

## Development

If you really feel the need to build this yourself:

1. Clone the repo.
2. Run `npm install`. Yes, you have to download `node_modules` to build the tool that deletes `node_modules`.
3. Run `npm start`.

To build a release:

```bash
npm run build
```

This uses `electron-builder`, so it handles Mac, Windows, and Linux. Theoretically.

## License

MIT. Do whatever you want with it.
