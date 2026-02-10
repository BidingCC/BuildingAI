import { useEffect } from "react";

export interface DocumentHeadOptions {
    title?: string;
    description?: string;
    keywords?: string;
    icon?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    ogType?: string;
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    canonical?: string;
    robots?: string;
    author?: string;
    themeColor?: string;
}

function setMetaTag(name: string, content: string, isProperty = false) {
    const attr = isProperty ? "property" : "name";
    let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;

    if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
    }

    meta.content = content;
}

function setLinkTag(rel: string, href: string, type?: string) {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

    if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
    }

    link.href = href;
    if (type) link.type = type;
}

/**
 * A hook to manage document head elements (title, meta tags, favicon, etc.)
 * for SEO and social sharing purposes.
 */
export const useDocumentHead = ({
    title,
    description,
    keywords,
    icon,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    ogType,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    canonical,
    robots,
    author,
    themeColor,
}: DocumentHeadOptions) => {
    useEffect(() => {
        if (title) document.title = title;
        if (description) setMetaTag("description", description);
        if (keywords) setMetaTag("keywords", keywords);
        if (author) setMetaTag("author", author);
        if (robots) setMetaTag("robots", robots);
        if (themeColor) setMetaTag("theme-color", themeColor);

        // Open Graph
        if (ogTitle || title) setMetaTag("og:title", ogTitle || title || "", true);
        if (ogDescription || description)
            setMetaTag("og:description", ogDescription || description || "", true);
        if (ogImage) setMetaTag("og:image", ogImage, true);
        if (ogUrl) setMetaTag("og:url", ogUrl, true);
        if (ogType) setMetaTag("og:type", ogType, true);

        // Twitter Card
        if (twitterCard) setMetaTag("twitter:card", twitterCard);
        if (twitterTitle || ogTitle || title)
            setMetaTag("twitter:title", twitterTitle || ogTitle || title || "");
        if (twitterDescription || ogDescription || description) {
            setMetaTag(
                "twitter:description",
                twitterDescription || ogDescription || description || "",
            );
        }
        if (twitterImage || ogImage) setMetaTag("twitter:image", twitterImage || ogImage || "");

        // Links
        if (canonical) setLinkTag("canonical", canonical);
        if (icon) {
            setLinkTag("icon", icon);
            setLinkTag("apple-touch-icon", icon);
        }
    }, [
        title,
        description,
        keywords,
        icon,
        ogTitle,
        ogDescription,
        ogImage,
        ogUrl,
        ogType,
        twitterCard,
        twitterTitle,
        twitterDescription,
        twitterImage,
        canonical,
        robots,
        author,
        themeColor,
    ]);
};
