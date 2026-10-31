# Team Records Hub (50)

Imported website: https://github.com/phuocnhtvietcasa-code/team-records-hub-96

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e9dd81cf-00d8-4230-9b65-280c81da3532).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Offline output verification

`bun run verify:offline` checks `dist/offline` and fails unless it contains only
`index.html`, with all HTML/CSS assets embedded. It then opens each of the five
application pages via `file://` hash URLs in Chromium with networking disabled,
checks navigation and reloads, and rejects broken images, external requests, or
browser exceptions. Screenshots are saved to `/tmp/browser/offline-verification`.

Requires Python 3 and the Python Playwright package with Chromium installed.
`postbuild:offline` runs this verification automatically for an npm
`build:offline` lifecycle (or can be called explicitly by an offline build).
The separate offline build is still pending; the hosted `build` is unchanged.
Missing output intentionally fails rather than validating the hosted build.
