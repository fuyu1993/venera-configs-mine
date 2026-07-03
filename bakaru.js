class Bakaru extends ComicSource {
    name = "bakaru"
    key = "bakaru"
    version = "1.0.2"
    minAppVersion = "2.0.0"
    url = "https://bakamh.ru/"

    // ==================== 账号 ====================

    account = {
        loginWithCookies: {
            fields: ["cf_clearance"],
            validate: async (values) => {
                let resp = await Network.get("https://bakamh.ru/", {});
                return resp.status !== 403;
            },
        },
        registerWebsite: "https://bakamh.ru/",
    }

    // ==================== 发现页 ====================

    explore = [
        {
            title: "最新更新",
            type: "multiPageComicList",
            load: async (page) => {
                let url = page === 1
                    ? "https://bakamh.ru/"
                    : `https://bakamh.ru/page/${page}/`;
                let resp = await Network.get(url, {});
                if (resp.status !== 200) {
                    return { comics: [], maxPage: 1 };
                }
                let doc = new HtmlDocument(resp.body);
                let items = doc.querySelectorAll(".page-item-detail");
                let comics = [];
                for (let item of items) {
                    let titleEl = item.querySelector(".post-title a") || item.querySelector("h3 a");
                    let imgEl = item.querySelector("img");
                    let chapterEl = item.querySelector(".chapter a") || item.querySelector(".list-chapter a");
                    if (!titleEl) continue;
                    comics.push(new Comic({
                        id: titleEl.getAttribute("href") || "",
                        title: titleEl.text.trim(),
                        subTitle: chapterEl ? chapterEl.text.trim() : "",
                        cover: imgEl ? (imgEl.getAttribute("data-src") || imgEl.getAttribute("src") || "") : "",
                    }));
                }
                let maxPage = 1;
                let pageLinks = doc.querySelectorAll(".wp-pagenavi a, .pagination a, .nav-links a");
                for (let link of pageLinks) {
                    let num = parseInt(link.text.trim());
                    if (!isNaN(num) && num > maxPage) maxPage = num;
                }
                doc.dispose();
                return { comics: comics, maxPage: maxPage };
            },
        },
    ]

    // ==================== 分类 ====================

    category = {
        title: "巴卡漫画2",
        parts: [
            {
                name: "分类",
                type: "fixed",
                categories: [
                    {
                        label: "全部漫画",
                        target: {
                            page: "category",
                            attributes: {
                                category: "全部漫画",
                                param: "",
                            },
                        },
                    },
                    {
                        label: "韩漫",
                        target: {
                            page: "category",
                            attributes: {
                                category: "韩漫",
                                param: "manhwa",
                            },
                        },
                    },
                    {
                        label: "BL漫画",
                        target: {
                            page: "category",
                            attributes: {
                                category: "BL漫画",
                                param: "bl",
                            },
                        },
                    },
                    {
                        label: "GL漫画",
                        target: {
                            page: "category",
                            attributes: {
                                category: "GL漫画",
                                param: "gl",
                            },
                        },
                    },
                    {
                        label: "全年龄",
                        target: {
                            page: "category",
                            attributes: {
                                category: "全年龄",
                                param: "allages",
                            },
                        },
                    },
                    {
                        label: "英文漫画",
                        target: {
                            page: "category",
                            attributes: {
                                category: "英文漫画",
                                param: "en-manga",
                            },
                        },
                    },
                    {
                        label: "动画",
                        target: {
                            page: "category",
                            attributes: {
                                category: "动画",
                                param: "anime",
                            },
                        },
                    },
                ],
            },
            {
                name: "状态",
                type: "fixed",
                categories: [
                    {
                        label: "全部状态",
                        target: {
                            page: "category",
                            attributes: {
                                category: "全部状态",
                                param: "",
                            },
                        },
                    },
                    {
                        label: "连载中",
                        target: {
                            page: "category",
                            attributes: {
                                category: "连载中",
                                param: "on-going",
                            },
                        },
                    },
                    {
                        label: "已完结",
                        target: {
                            page: "category",
                            attributes: {
                                category: "已完结",
                                param: "end",
                            },
                        },
                    },
                    {
                        label: "新作",
                        target: {
                            page: "category",
                            attributes: {
                                category: "新作",
                                param: "newmanga",
                            },
                        },
                    },
                ],
            },
        ],
        enableRankingPage: false,
    }

    // ==================== 分类漫画加载 ====================

    categoryComics = {
        load: async (category, param, options, page) => {
            let path = param || "";
            let url;
            if (path === "") {
                url = page === 1
                    ? "https://bakamh.ru/"
                    : `https://bakamh.ru/page/${page}/`;
            } else {
                url = page === 1
                    ? `https://bakamh.ru/${path}/`
                    : `https://bakamh.ru/${path}/page/${page}/`;
            }
            let resp = await Network.get(url, {});
            if (resp.status !== 200) {
                return { comics: [], maxPage: 1 };
            }
            let doc = new HtmlDocument(resp.body);
            let items = doc.querySelectorAll(".page-item-detail");
            let comics = [];
            for (let item of items) {
                let titleEl = item.querySelector(".post-title a") || item.querySelector("h3 a");
                let imgEl = item.querySelector("img");
                let chapterEl = item.querySelector(".chapter a") || item.querySelector(".list-chapter a");
                if (!titleEl) continue;
                comics.push(new Comic({
                    id: titleEl.getAttribute("href") || "",
                    title: titleEl.text.trim(),
                    subTitle: chapterEl ? chapterEl.text.trim() : "",
                    cover: imgEl ? (imgEl.getAttribute("data-src") || imgEl.getAttribute("src") || "") : "",
                }));
            }
            let maxPage = 1;
            let pageLinks = doc.querySelectorAll(".wp-pagenavi a, .pagination a, .nav-links a");
            for (let link of pageLinks) {
                let num = parseInt(link.text.trim());
                if (!isNaN(num) && num > maxPage) maxPage = num;
            }
            doc.dispose();
            return { comics: comics, maxPage: maxPage };
        },
    }

    // ==================== 搜索 ====================

    search = {
        load: async (keyword, page) => {
            let url = page === 1
                ? `https://bakamh.ru/?s=${encodeURIComponent(keyword)}&post_type=wp-manga`
                : `https://bakamh.ru/page/${page}/?s=${encodeURIComponent(keyword)}&post_type=wp-manga`;
            let resp = await Network.get(url, {});
            if (resp.status !== 200) {
                return { comics: [], maxPage: 1 };
            }
            let doc = new HtmlDocument(resp.body);
            let items = doc.querySelectorAll(".page-item-detail, .search-wrap .c-tabs-item");
            if (items.length === 0) {
                items = doc.querySelectorAll("article");
            }
            let comics = [];
            for (let item of items) {
                let titleEl = item.querySelector(".post-title a") || item.querySelector("h3 a") || item.querySelector("h2 a");
                let imgEl = item.querySelector("img");
                let chapterEl = item.querySelector(".chapter a, .list-chapter a");
                if (!titleEl) continue;
                let comicId = titleEl.getAttribute("href") || "";
                if (!comicId.includes("/manga/")) continue;
                comics.push(new Comic({
                    id: comicId,
                    title: titleEl.text.trim(),
                    subTitle: chapterEl ? chapterEl.text.trim() : "",
                    cover: imgEl ? (imgEl.getAttribute("data-src") || imgEl.getAttribute("src") || "") : "",
                }));
            }
            let maxPage = 1;
            let pageLinks = doc.querySelectorAll(".wp-pagenavi a, .pagination a, .nav-links a, .search-navigation a");
            for (let link of pageLinks) {
                let num = parseInt(link.text.trim());
                if (!isNaN(num) && num > maxPage) maxPage = num;
            }
            doc.dispose();
            return { comics: comics, maxPage: maxPage };
        },
    }

    // ==================== 漫画详情 & 章节 ====================

    comic = {
        load: async (id, subId) => {
            let url = id;
            if (!url.startsWith("http")) {
                url = "https://bakamh.ru" + (url.startsWith("/") ? "" : "/") + url;
            }
            let resp = await Network.get(url, {});
            if (resp.status !== 200) {
                throw new Error("Failed to load comic details: " + resp.status);
            }
            let doc = new HtmlDocument(resp.body);

            // 标题
            let titleEl = doc.querySelector(".post-title h1") || doc.querySelector(".post-title") || doc.querySelector("h1");
            let title = titleEl ? titleEl.text.trim() : "";

            // 封面
            let coverImg = doc.querySelector(".summary_image img") || doc.querySelector(".tab-summary img") || doc.querySelector(".featured-img img");
            let cover = coverImg ? (coverImg.getAttribute("data-src") || coverImg.getAttribute("src") || "") : "";

            // 替代标题
            let altEl = doc.querySelector(".alternative-content") || doc.querySelector(".mg_alternative .summary-content");
            let alternative = altEl ? altEl.text.trim() : "";

            // 描述
            let descEl = doc.querySelector(".summary__content p") || doc.querySelector(".description-summary .summary__content") || doc.querySelector(".manga-excerpt p") || doc.querySelector(".summary_content_wrap .summary_content p");
            let description = descEl ? descEl.text.trim() : "";

            // 作者
            let authorEl = doc.querySelector(".author-content a") || doc.querySelector(".mg_author .summary-content a");
            let authorStr = authorEl ? "作者: " + authorEl.text.trim() : "";

            // 状态
            let statusEl = doc.querySelector(".post-status .summary-content") || doc.querySelector(".mg_status .summary-content");
            let statusStr = statusEl ? "状态: " + statusEl.text.trim() : "";

            let subtitle = [alternative, authorStr, statusStr].filter(s => s).join(" | ");

            // 标签
            let tagEls = doc.querySelectorAll(".genres-content a, .mg_genres .summary-content a");
            let tags = [];
            for (let tagEl of tagEls) {
                let tagText = tagEl.text.trim();
                if (tagText) tags.push(tagText);
            }

            // 章节
            let chapterEls = doc.querySelectorAll(".wp-manga-chapter a, .version-chap a, li.wp-manga-chapter a, .chapter-name-rtl a");
            let chapters = {};
            for (let chEl of chapterEls) {
                let chUrl = chEl.getAttribute("href") || "";
                let chTitle = chEl.text.trim();
                if (chUrl && chTitle) {
                    chapters[chUrl] = chTitle;
                }
            }

            // 缩略图
            let thumbnails = [];
            let thumbEls = doc.querySelectorAll(".summary_image img, .tab-summary img");
            for (let thumb of thumbEls) {
                let src = thumb.getAttribute("data-src") || thumb.getAttribute("src") || "";
                if (src) thumbnails.push(src);
            }

            doc.dispose();

            return new ComicDetails({
                title: title,
                subTitle: subtitle || null,
                cover: cover,
                description: description,
                tags: tags.length > 0 ? tags : null,
                chapters: chapters,
                thumbnails: thumbnails.length > 0 ? thumbnails : null,
            });
        },

        loadEp: async (comicId, epId) => {
            let url = epId;
            if (!url.startsWith("http")) {
                url = "https://bakamh.ru" + (url.startsWith("/") ? "" : "/") + url;
            }
            let resp = await Network.get(url, {});
            if (resp.status !== 200) {
                throw new Error("Failed to load chapter: " + resp.status);
            }
            let doc = new HtmlDocument(resp.body);
            let imgEls = doc.querySelectorAll(".reading-content img, .page-break img, .text-left img, .entry-content img");
            let images = [];
            for (let img of imgEls) {
                let src = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("src") || "";
                if (src && !src.includes("data:image") && !src.includes("avatar") && !src.includes("logo")) {
                    images.push(src);
                }
            }
            doc.dispose();
            if (images.length === 0) {
                throw new Error("No images found in chapter");
            }
            return images;
        },

        // 链接解析
        link: {
            domains: ["bakamh.ru", "www.bakamh.ru"],
            linkToId: (url) => {
                let match = url.match(/bakamh\.ru(\/manga\/[^/?#]+)/);
                if (match) return match[1];
                return null;
            },
        },

        // 标签点击
        onClickTag: (namespace, tag) => {
            return {
                action: "search",
                keyword: tag,
            };
        },
    }

    // ==================== 翻译 ====================

    translation = {
        'zh_CN': {},
        'en': {},
    }
}
