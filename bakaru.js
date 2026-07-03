class Bakaru extends ComicSource {
    name = "bakaru(巴卡漫画)"
    key = "bakaru"
    version = "1.0.1"
    minAppVersion = "2.0.0"
    url = "https://bakamh.ru/"
    
    // ==================== 账号相关 ====================
    
    account = {
        loginWithCookies: {
            fields: [
                "cf_clearance",
            ],
            validate: async (values) => {
                // 验证 cf_clearance cookie 是否有效
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
                // Madara 主题默认的漫画列表页
                let url = `https://bakamh.ru/page/${page}/`;
                if (page === 1) {
                    url = "https://bakamh.ru/";
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
                // 分页：查找最大页数
                let maxPage = 1;
                let pageLinks = doc.querySelectorAll(".wp-pagenavi a, .pagination a, .nav-links a");
                for (let link of pageLinks) {
                    let num = parseInt(link.text.trim());
                    if (!isNaN(num) && num > maxPage) {
                        maxPage = num;
                    }
                }
                doc.dispose();
                return { comics: comics, maxPage: maxPage };
            },
        },
        
        {
            title: "热门漫画",
            type: "multiPageComicList",
            load: async (page) => {
                let url = `https://bakamh.ru/热门漫画/page/${page}/`;
                if (page === 1) {
                    url = "https://bakamh.ru/热门漫画/";
                }
                let resp = await Network.get(url, {});
                if (resp.status !== 200) {
                    // 如果热门页面不存在，回退到按热度排序
                    let altUrl = `https://bakamh.ru/page/${page}/?m_orderby=views`;
                    resp = await Network.get(altUrl, {});
                }
                if (resp.status !== 200) {
                    return { comics: [], maxPage: 1 };
                }
                let doc = new HtmlDocument(resp.body);
                let items = doc.querySelectorAll(".page-item-detail");
                let comics = [];
                for (let item of items) {
                    let titleEl = item.querySelector(".post-title a") || item.querySelector("h3 a");
                    let imgEl = item.querySelector("img");
                    if (!titleEl) continue;
                    comics.push(new Comic({
                        id: titleEl.getAttribute("href") || "",
                        title: titleEl.text.trim(),
                        subTitle: "",
                        cover: imgEl ? (imgEl.getAttribute("data-src") || imgEl.getAttribute("src") || "") : "",
                    }));
                }
                // 分页
                let maxPage = 1;
                let pageLinks = doc.querySelectorAll(".wp-pagenavi a, .pagination a, .nav-links a");
                for (let link of pageLinks) {
                    let num = parseInt(link.text.trim());
                    if (!isNaN(num) && num > maxPage) {
                        maxPage = num;
                    }
                }
                doc.dispose();
                return { comics: comics, maxPage: Math.max(maxPage, 1) };
            },
        },
    ]
    
    // ==================== 漫画详情 ====================
    
    getComicDetails = async (id, subId) => {
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
        
        // 副标题（替代标题）
        let altEl = doc.querySelector(".alternative-content") || doc.querySelector(".mg_alternative .summary-content");
        let alternative = altEl ? altEl.text.trim() : "";
        
        // 描述
        let descEl = doc.querySelector(".summary__content p") || doc.querySelector(".description-summary .summary__content") || doc.querySelector(".manga-excerpt p") || doc.querySelector(".summary_content_wrap .summary_content p");
        let description = descEl ? descEl.text.trim() : "";
        
        // 作者
        let authorEl = doc.querySelector(".author-content a") || doc.querySelector(".mg_author .summary-content a");
        let author = authorEl ? authorEl.text.trim() : "";
        if (author) {
            author = "作者: " + author;
        }
        
        // 状态
        let statusEl = doc.querySelector(".post-status .summary-content") || doc.querySelector(".mg_status .summary-content");
        let status = statusEl ? statusEl.text.trim() : "";
        if (status) {
            author = author + (author ? " | " : "") + "状态: " + status;
        }
        
        // 标签
        let tagEls = doc.querySelectorAll(".genres-content a, .mg_genres .summary-content a");
        let tags = [];
        for (let tagEl of tagEls) {
            let tagText = tagEl.text.trim();
            if (tagText) {
                tags.push(tagText);
            }
        }
        
        // 章节
        let chapterEls = doc.querySelectorAll(".wp-manga-chapter a, .version-chap a, li.wp-manga-chapter a, .chapter-name-rtl a");
        let chapters = {};
        let chapterArray = [];
        for (let chEl of chapterEls) {
            let chUrl = chEl.getAttribute("href") || "";
            let chTitle = chEl.text.trim();
            if (chUrl && chTitle) {
                chapters[chUrl] = chTitle;
                chapterArray.push({ url: chUrl, title: chTitle });
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
        
        // 整理章节：反转顺序让最新的在前
        let chapterKeys = Object.keys(chapters);
        let sortedChapters = {};
        for (let key of chapterKeys) {
            sortedChapters[key] = chapters[key];
        }
        
        return new ComicDetails({
            title: title,
            subTitle: alternative || author,
            cover: cover,
            description: description,
            tags: tags.length > 0 ? tags : null,
            chapters: sortedChapters,
            thumbnails: thumbnails.length > 0 ? thumbnails : null,
        });
    }
    
    // ==================== 获取章节图片 ====================
    
    getChapterImages = async (comicId, epId) => {
        let url = epId;
        if (!url.startsWith("http")) {
            url = "https://bakamh.ru" + (url.startsWith("/") ? "" : "/") + url;
        }
        let resp = await Network.get(url, {});
        if (resp.status !== 200) {
            throw new Error("Failed to load chapter: " + resp.status);
        }
        let doc = new HtmlDocument(resp.body);
        
        // 获取所有图片
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
    }
    
    // ==================== 搜索 ====================
    
    search = {
        load: async (keyword, page) => {
            let url = `https://bakamh.ru/page/${page}/?s=${encodeURIComponent(keyword)}&post_type=wp-manga`;
            if (page === 1) {
                url = `https://bakamh.ru/?s=${encodeURIComponent(keyword)}&post_type=wp-manga`;
            }
            let resp = await Network.get(url, {});
            if (resp.status !== 200) {
                return { comics: [], maxPage: 1 };
            }
            let doc = new HtmlDocument(resp.body);
            
            let items = doc.querySelectorAll(".page-item-detail, .search-wrap .c-tabs-item");
            if (items.length === 0) {
                // 备用选择器
                items = doc.querySelectorAll("article");
            }
            
            let comics = [];
            for (let item of items) {
                let titleEl = item.querySelector(".post-title a") || item.querySelector("h3 a") || item.querySelector("h2 a");
                let imgEl = item.querySelector("img");
                let chapterEl = item.querySelector(".chapter a, .list-chapter a");
                if (!titleEl) continue;
                let comicId = titleEl.getAttribute("href") || "";
                // 过滤非漫画链接
                if (!comicId.includes("/manga/")) continue;
                comics.push(new Comic({
                    id: comicId,
                    title: titleEl.text.trim(),
                    subTitle: chapterEl ? chapterEl.text.trim() : "",
                    cover: imgEl ? (imgEl.getAttribute("data-src") || imgEl.getAttribute("src") || "") : "",
                }));
            }
            
            // 分页
            let maxPage = 1;
            let pageLinks = doc.querySelectorAll(".wp-pagenavi a, .pagination a, .nav-links a, .search-navigation a");
            for (let link of pageLinks) {
                let num = parseInt(link.text.trim());
                if (!isNaN(num) && num > maxPage) {
                    maxPage = num;
                }
            }
            
            doc.dispose();
            return { comics: comics, maxPage: maxPage };
        },
    }
    
    // ==================== 链接解析 ====================
    
    link = {
        domains: [
            'bakamh.ru',
            'www.bakamh.ru',
        ],
        linkToId: (url) => {
            // 从完整 URL 提取漫画路径作为 ID
            let match = url.match(/bakamh\.ru(\/manga\/[^/?#]+)/);
            if (match) {
                return match[1];
            }
            return null;
        }
    }
    
    // ==================== 标签点击处理 ====================
    
    onClickTag = (namespace, tag) => {
        return {
            action: "search",
            keyword: tag,
        };
    }
    
    // ==================== 翻译 ====================
    
    translation = {
        'zh_CN': {
            'Latest Update': '最新更新',
            'Popular Manga': '热门漫画',
        },
        'en': {
            'Latest Update': 'Latest Update',
            'Popular Manga': 'Popular Manga',
        }
    }
}

// 注册源
Bakaru.sources = Bakaru.sources || {};
Bakaru.sources["bakaru"] = Bakaru;
