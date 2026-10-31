"""Fail closed on extra output, external resources, or broken file:// pages."""
import argparse
import asyncio
import re
from html.parser import HTMLParser
from pathlib import Path

PAGES = {
    "/dashboard-doanh-so": "Dashboard Doanh số",
    "/dashboard-cong-no": "Dashboard Công nợ",
    "/phieu": "Phiếu doanh số",
    "/nhan-vien": "Nhân viên",
    "/cai-dat": "Cài đặt & dữ liệu",
}


def embedded(value):
    return value.strip().lower().startswith(("data:", "#"))


class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.errors = []
        self.style = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "base":
            self.errors.append("base URL is not allowed")
        for key in ("src", "poster", "data" if tag == "object" else "src"):
            value = attrs.get(key)
            if value and not embedded(value):
                self.errors.append(f"{tag}[{key}]: {value}")
        if attrs.get("srcset"):
            # Reject srcset entirely; data URLs contain ambiguous commas.
            self.errors.append("srcset must be replaced with an embedded src")
        if tag == "link" and attrs.get("href") and not embedded(attrs["href"]):
            self.errors.append(f"link[href]: {attrs['href']}")
        self.check_css(attrs.get("style", ""))
        if tag == "style":
            self.style = True

    def handle_endtag(self, tag):
        if tag == "style":
            self.style = False

    def handle_data(self, data):
        if self.style:
            self.check_css(data)

    def check_css(self, css):
        if re.search(r"@import\b", css, re.I):
            self.errors.append("CSS @import must be inlined")
        for value in re.findall(r"url\(\s*['\"]?(.*?)['\"]?\s*\)", css, re.I):
            if not embedded(value):
                self.errors.append(f"CSS url: {value}")


def check_output(folder):
    if not folder.is_dir():
        raise ValueError(f"Offline output missing: {folder}")
    entries = sorted(p.relative_to(folder).as_posix() for p in folder.rglob("*"))
    if entries != ["index.html"] or not (folder / "index.html").is_file():
        raise ValueError(f"Expected only index.html, found: {entries}")
    html = (folder / "index.html").read_text(encoding="utf-8")
    parser = Resources()
    parser.feed(html)
    if parser.errors:
        raise ValueError("External assets: " + "; ".join(parser.errors))
    return folder / "index.html"


async def check_pages(html, screenshots):
    from playwright.async_api import async_playwright

    screenshots.mkdir(parents=True, exist_ok=True)
    uri = html.resolve().as_uri()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        await context.set_offline(True)
        page = await context.new_page()
        errors = []
        external = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)

        async def guard(route):
            url = route.request.url
            if url.split("#")[0] == uri or url.startswith(("data:", "blob:")):
                await route.continue_()
            else:
                external.append(url)
                await route.abort()

        await context.route("**/*", guard)
        try:
            for path, label in PAGES.items():
                await page.goto(uri + "#" + path, wait_until="load")
                await page.get_by_role("heading", name=label, exact=True).wait_for()
                link = page.get_by_role("link", name=label, exact=True).first
                href = await link.get_attribute("href")
                if not href or "#" + path not in href:
                    raise ValueError(f"Navigation is not hash-based: {path}")
                other_path = next(p for p in PAGES if p != path)
                await page.get_by_role("link", name=PAGES[other_path], exact=True).first.click()
                await page.get_by_role("heading", name=PAGES[other_path], exact=True).wait_for()
                await page.get_by_role("link", name=label, exact=True).first.click()
                await page.reload(wait_until="load")
                await page.get_by_role("heading", name=label, exact=True).wait_for()
                if page.url.split("#")[-1] != path:
                    raise ValueError(f"Wrong page after reload: {path}")
                broken_images = await page.locator("img").evaluate_all(
                    "imgs => imgs.some(i => !i.complete || i.naturalWidth === 0)"
                )
                if broken_images:
                    raise ValueError(f"Missing image on {path}")
                # Let delayed rendering/fetches settle before accepting the page.
                await page.wait_for_timeout(300)
                await page.screenshot(path=str(screenshots / (path[1:] + ".png")))
                print(f"PASS file:// navigation and reload: {path}")
            if errors or external:
                raise ValueError(f"Browser errors: {errors}; external requests: {external}")
        finally:
            await browser.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", nargs="?", type=Path, default=Path("dist/offline"))
    parser.add_argument("--static-only", action="store_true", help="For validator unit tests only")
    parser.add_argument("--screenshots", type=Path, default=Path("/tmp/browser/offline-verification"))
    args = parser.parse_args()
    try:
        html = check_output(args.folder)
        print("PASS only index.html; no external HTML/CSS resources")
        if not args.static_only:
            asyncio.run(check_pages(html, args.screenshots))
    except Exception as error:
        parser.exit(1, f"FAIL offline verification: {error}\n")


if __name__ == "__main__":
    main()