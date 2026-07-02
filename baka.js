/** @type {import('./_venera_.js')} */

/**
 * 巴卡漫画 (bakamh.ru) 漫画源适配器
 * 基于 WordPress + Madara 主题 (madara-child-mk-jp)
 */

class Baka extends ComicSource {
    // 漫画源基本信息
    name = "巴卡漫画";
    key = "baka";
    version = "1.0.0";
    minAppVersion = "1.6.0";
    url = "https://cdn.jsdelivr.net/gh/fuyu1993/venera-configs-mine@main/baka.js";

    // 基础URL
    baseUrl = "https://bakamh.ru";

    init() {
        /**
         * 获取并解析HTML页面
         * @param {string} url
         * @param {Object} options
         * @returns {Promise<HtmlDocument>}
         */
        this.fetchHtml = async (url, options = {}) => {
            let method = options.method || "GET";
            let headers = options.headers || {};
            let payload = options.payload || null;
            let res = await Network.sendRequest(method, url, headers, payload);
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}, url: ${url}`;
            }
            return new HtmlDocument(res.body);
        };

        this.logger = {
            error: (msg) => log("error", this.name, msg),
            info: (msg) => log("info", this.name, msg),
            warn: (msg) => log("warning", this.name, msg),
        };
    }

    /**
     * 通用漫画列表解析函数
     * 从 Madara 主题的漫画列表页面解析漫画数据
     * @param {HtmlDocument} doc
     * @returns {{comics: Comic[], maxPage: number}}
     */
    _parseComicList(doc) {
        let items = doc.querySelectorAll(".page-item-detail.manga");
        let comics = [];

        for (let item of items) {
            try {
                let titleEl = item.querySelector("h3.h5 a");
                if (!titleEl) continue;

                let title = titleEl.text.trim();
                let mangaUrl = titleEl.attributes.href || "";
                // 从URL中提取slug作为ID
                let id = mangaUrl.split("/").filter(s => s.length > 0).pop();

                let coverEl = item.querySelector(".item-thumb img");
                let cover = "";
                if (coverEl) {
                    cover = coverEl.attributes.src
                        || coverEl.attributes["data-src"]
                        || coverEl.attributes["data-lazy-src"]
                        || "";
                }

                // 评分
                let scoreEl = item.querySelector(".score.font-meta.total_votes");
                let stars = scoreEl ? parseFloat(scoreEl.text.trim()) || 0 : 0;

                // 标签 - 从chapter item中无法直接获取，留空
                let tags = [];

                comics.push(new Comic({
                    id: id,
                    title: title,
                    subTitle: "",
                    cover: cover,
                    tags: tags,
                    stars: stars > 0 ? stars : undefined,
                }));
            } catch (e) {
                this.logger.warn(`解析漫画卡片失败: ${e}`);
            }
        }

        // 计算最大页码
        let maxPage = 1;
        let paginationLinks = doc.querySelectorAll(".wp-pagenavi a.page, .navigation-ajax a.page");
        if (paginationLinks.length > 0) {
            for (let link of paginationLinks) {
                let pageNum = parseInt(link.text.trim());
                if (!isNaN(pageNum) && pageNum > maxPage) {
                    maxPage = pageNum;
                }
            }
        } else {
            // 尝试从 "下一页" 链接判断是否有更多页
            let nextLink = doc.querySelector(".wp-pagenavi .nextpostslink, .nav-previous a");
            // 如果当前页有漫画，假设至少有当前页+1页
            if (comics.length > 0) {
                maxPage = nextLink ? 100 : 1; // 保守估计
            }
        }

        return { comics, maxPage };
    }

    // ============ 探索页(首页) ============
    explore = [
        {
            title: "最新更新",
            type: "multiPageComicList",
            load: async (page) => {
                let url = page === 1
                    ? this.baseUrl
                    : `${this.baseUrl}/page/${page}/`;
                let doc = await this.fetchHtml(url);
                return this._parseComicList(doc);
            },
        },
    ];

    // ============ 分类体系 ============
    category = {
        title: "巴卡漫画",
        parts: [
            {
                name: "分类",
                type: "fixed",
                itemType: "category",
                categories: [
                    "全部漫画",
                    "韩漫",
                    "BL漫画",
                    "GL漫画",
                    "全年龄",
                    "英文漫画",
                    "动画",
                ],
                categoryParams: [
                    "",
                    "manhwa",
                    "bl",
                    "gl",
                    "allages",
                    "en-manga",
                    "anime",
                ],
            },
            {
                name: "状态",
                type: "fixed",
                itemType: "category",
                categories: [
                    "全部状态",
                    "连载中",
                    "已完结",
                    "新作",
                ],
                categoryParams: [
                    "",
                    "on-going",
                    "end",
                    "newmanga",
                ],
            },
        ],
        enableRankingPage: false,
    };

    // ============ 分类漫画加载 ============
    categoryComics = {
        load: async (category, param, options, page) => {
            // param为空表示"全部"，按首页方式加载
            let path = param || "";
            let url;
            if (path === "") {
                url = page === 1
                    ? this.baseUrl
                    : `${this.baseUrl}/page/${page}/`;
            } else {
                url = page === 1
                    ? `${this.baseUrl}/${path}/`
                    : `${this.baseUrl}/${path}/page/${page}/`;
            }

            let doc = await this.fetchHtml(url);
            return this._parseComicList(doc);
        },
    };

    // ============ 搜索功能 ============
    search = {
        load: async (keyword, options, page) => {
            let url;
            // WordPress搜索URL格式
            let encodedKeyword = encodeURIComponent(keyword);
            if (page === 1) {
                url = `${this.baseUrl}/?s=${encodedKeyword}&post_type=wp-manga`;
            } else {
                url = `${this.baseUrl}/page/${page}/?s=${encodedKeyword}&post_type=wp-manga`;
            }

            let doc = await this.fetchHtml(url);

            // 检查是否有搜索结果
            let noResult = doc.querySelector(".search-result-count, .no-result");
            if (noResult) {
                let noResultText = noResult.text.trim();
                if (noResultText.includes("没有") || noResultText.includes("0")) {
                    return { comics: [], maxPage: 1 };
                }
            }

            return this._parseComicList(doc);
        },
        // enable tags suggestions
        enableTagsSuggestions: false,
    };

    // ============ 漫画详情 ============
    comic = {
        /**
         * 加载漫画详细信息
         * @param {string} id - 漫画slug
         * @returns {Promise<ComicDetails>}
         */
        loadInfo: async (id) => {
            let url = `${this.baseUrl}/manga/${id}/`;
            let doc = await this.fetchHtml(url);

            // 标题
            let titleEl = doc.querySelector("#manga-title h1");
            let title = titleEl ? titleEl.text.trim() : "";

            // 封面
            let coverEl = doc.querySelector(".summary_image a img");
            let cover = coverEl
                ? (coverEl.attributes.src || coverEl.attributes["data-src"] || "")
                : "";

            // 别名
            let altTitleEl = doc.querySelector(".post-content_item .summary-content");
            let altTitle = "";
            let postItems = doc.querySelectorAll(".post-content_item");
            for (let item of postItems) {
                let heading = item.querySelector(".summary-heading h5");
                if (heading && heading.text.trim() === "别名") {
                    let content = item.querySelector(".summary-content");
                    altTitle = content ? content.text.trim() : "";
                    break;
                }
            }

            // 作者
            let authors = [];
            let authorLinks = doc.querySelectorAll(".author-content a");
            for (let a of authorLinks) {
                authors.push(a.text.trim());
            }

            // 状态
            let status = "未知";
            for (let item of postItems) {
                let heading = item.querySelector(".summary-heading h5");
                if (heading && heading.text.trim() === "状态") {
                    let content = item.querySelector(".summary-content");
                    status = content ? content.text.trim() : "未知";
                    break;
                }
            }

            // 分类 (manga-genre)
            let genreLinks = doc.querySelectorAll(".genres-content a");
            let genres = [];
            for (let a of genreLinks) {
                genres.push(a.text.trim());
            }

            // 标签 (manga-tag)
            let tagLinks = doc.querySelectorAll(".tags-content a");
            let tagNames = [];
            for (let a of tagLinks) {
                tagNames.push(a.text.trim());
            }

            // 标签Map
            let tagsMap = {};
            if (genres.length > 0) {
                tagsMap["分类"] = genres;
            }
            if (tagNames.length > 0) {
                tagsMap["标签"] = tagNames;
            }
            if (status) {
                tagsMap["状态"] = [status];
            }

            // 简介
            let descEl = doc.querySelector(".summary__content p, .post-content_item .post-content_item:last-child p");
            let description = "";
            // 查找简介所在的post_content_item
            for (let item of postItems) {
                let heading = item.querySelector(".summary-heading h5");
                if (heading && heading.text.trim() === "简介：") {
                    let pEls = item.querySelectorAll("p");
                    let descParts = [];
                    for (let p of pEls) {
                        descParts.push(p.text.trim());
                    }
                    description = descParts.join("\n");
                    break;
                }
            }
            // 备用：直接查找p标签
            if (!description) {
                let summaryWrap = doc.querySelector(".summary__content");
                if (summaryWrap) {
                    let pEls = summaryWrap.querySelectorAll("p");
                    let descParts = [];
                    for (let p of pEls) {
                        descParts.push(p.text.trim());
                    }
                    description = descParts.join("\n");
                }
            }

            // 评分
            let scoreEl = doc.querySelector(".post-total-rating .score.font-meta.total_votes");
            let stars = scoreEl ? parseFloat(scoreEl.text.trim()) || 0 : 0;

            // 章节列表
            let chapterItems = doc.querySelectorAll("#tab-chapter-listing ul.main.version-chap li");
            let chapters = new Map();
            for (let li of chapterItems) {
                let link = li.querySelector("a");
                if (!link) continue;
                let chapterUrl = link.attributes.href || "";
                let chapterId = chapterUrl.split("/").filter(s => s.length > 0).pop();
                let chapterTitle = link.text.trim();
                if (chapterId && chapterTitle) {
                    chapters.set(chapterId, chapterTitle);
                }
            }

            // 如果页面有"显示更多"按钮，章节可能被截断；先使用已加载的章节

            // 更新时间 - 从最新章节日期获取
            let updateTime = "";
            let dateEl = doc.querySelector(".chapter-release-date i");
            if (dateEl) {
                updateTime = dateEl.text.trim();
            }

            return new ComicDetails({
                title: title,
                subTitle: altTitle || authors.join(", "),
                cover: cover,
                description: description,
                tags: tagsMap,
                chapters: chapters,
                updateTime: updateTime,
                url: url,
                stars: stars > 0 ? stars : undefined,
            });
        },

        /**
         * 加载章节图片
         * @param {string} comicId - 漫画slug
         * @param {string} epId - 章节ID (c-xxx格式)
         * @returns {Promise<{images: string[]}>}
         */
        loadEp: async (comicId, epId) => {
            let url = `${this.baseUrl}/manga/${comicId}/${epId}/`;
            let doc = await this.fetchHtml(url);

            let images = [];

            // Madara主题: 图片在 .reading-content 中，使用 data-manga-src 懒加载
            let imgEls = doc.querySelectorAll(".reading-content img");
            for (let img of imgEls) {
                // 优先使用 data-manga-src（原图），否则使用 src
                let src = img.attributes["data-manga-src"]
                    || img.attributes["data-src"]
                    || img.attributes["data-lazy-src"]
                    || img.attributes.src
                    || "";

                // 过滤掉非内容图片（如loading图标、广告等）
                if (src && !src.includes("loading") && !src.includes("spinner") && !src.includes("avatar")) {
                    images.push(src.trim());
                }
            }

            return { images };
        },

        onImageLoad: (url, comicId, epId) => {
            return {
                url: url,
                headers: {
                    "Referer": `${this.baseUrl}/manga/${comicId}/${epId}/`,
                },
            };
        },

        // 用于识别用户输入的漫画URL
        link: {
            domains: [
                "bakamh.ru",
                "bakamh.com",
                "bakamh.app",
            ],
            /**
             * 从URL解析漫画ID
             * @param {string} url - 完整URL
             * @returns {string | null}
             */
            linkToId: (url) => {
                // 匹配 /manga/{slug}/ 或 /manga/{slug}/c-xxx/ 格式
                let match = url.match(/\/manga\/([^/]+)/);
                if (match) {
                    return match[1];
                }
                return null;
            },
        },
    };
}
