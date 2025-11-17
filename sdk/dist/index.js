"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ChatbotAd: () => ChatbotAd,
  fetchAd: () => fetchAd,
  trackAdClick: () => trackAdClick,
  trackAdImpression: () => trackAdImpression,
  useChatbotAd: () => useChatbotAd
});
module.exports = __toCommonJS(index_exports);

// src/api.ts
var DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_VIVOS_API_URL || "https://api.vivosadnetwork.com";
async function fetchAd(params) {
  const { publisherId, keyword, host } = params;
  let urlString;
  if (host && typeof window !== "undefined") {
    const proxyUrl = new URL("/api/ads", window.location.origin);
    proxyUrl.searchParams.set("keyword", keyword);
    proxyUrl.searchParams.set("publisher_id", publisherId);
    urlString = proxyUrl.toString();
  } else if (host) {
    const url = new URL("/api/ads", host);
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("publisher_id", publisherId);
    urlString = url.toString();
  } else {
    const url = new URL("/api/ads", DEFAULT_API_BASE_URL);
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("publisher_id", publisherId);
    urlString = url.toString();
  }
  console.log("\u{1F310} [fetchAd] Ad request:", { keyword, publisherId });
  try {
    const response = await fetch(urlString, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        console.log("\u{1F310} [fetchAd] Ad response: empty");
        return null;
      }
      throw new Error(`Failed to fetch ad: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("\u{1F310} [fetchAd] Full server response:", data);
    let ad = null;
    if (data.ads && Array.isArray(data.ads) && data.ads.length > 0) {
      ad = data.ads[0];
    } else {
      ad = data.ad || data || null;
    }
    if (ad && !ad.matched_keyword) {
      console.log("\u{1F310} [fetchAd] Ad response: empty (no matched_keyword)");
      return null;
    }
    console.log("\u{1F310} [fetchAd] Ad response:", ad ? { id: ad.id, matched_keyword: ad.matched_keyword } : "empty");
    return ad;
  } catch (error) {
    return null;
  }
}

// src/hooks.ts
var import_react = require("react");
function useChatbotAd(keyword, publisherId, host) {
  const [ad, setAd] = (0, import_react.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!publisherId || !keyword) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    fetchAd({ publisherId, keyword, host }).then((fetchedAd) => {
      setAd(fetchedAd);
      setIsLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err : new Error("Failed to fetch ad"));
      setIsLoading(false);
    });
  }, [keyword, publisherId, host]);
  const adAsText = ad ? `${ad.title}
${ad.message}
${ad.target_url}` : null;
  const adAsMarkdown = ad ? `**${ad.title}**

${ad.message}

[Learn more](${ad.target_url})` : null;
  return {
    ad,
    adAsText,
    adAsMarkdown,
    isLoading,
    error
  };
}

// src/tracking.ts
function isReactNative() {
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}
async function getReactNativeModules() {
  try {
    try {
      const RN = await import("react-native");
      if (RN.Platform && RN.Dimensions) {
        console.log("\u2705 [VivosSDK] Loaded React Native modules via import");
        return { Platform: RN.Platform, Dimensions: RN.Dimensions };
      }
    } catch (e) {
    }
    const Platform = global.Platform || window?.Platform;
    const Dimensions = global.Dimensions || window?.Dimensions;
    if (Platform || Dimensions) {
      console.log("\u2705 [VivosSDK] Found React Native modules in global scope");
      return { Platform, Dimensions };
    }
    try {
      if (typeof require !== "undefined") {
        const RN = require("react-native");
        if (RN.Platform && RN.Dimensions) {
          console.log("\u2705 [VivosSDK] Loaded React Native modules via require");
          return { Platform: RN.Platform, Dimensions: RN.Dimensions };
        }
      }
    } catch (e) {
    }
    return {};
  } catch (error) {
    console.log("\u2139\uFE0F [VivosSDK] React Native modules not available (this is normal for web)");
    return {};
  }
}
async function getDeviceInfo() {
  const deviceInfo = {};
  if (isReactNative()) {
    console.log("\u{1F50D} [VivosSDK] Detected React Native environment");
    try {
      const { Platform, Dimensions } = await getReactNativeModules();
      console.log("\u{1F50D} [VivosSDK] Platform available:", !!Platform);
      console.log("\u{1F50D} [VivosSDK] Dimensions available:", !!Dimensions);
      if (Platform) {
        deviceInfo.platform = "react-native";
        deviceInfo.device_os = `${Platform.OS} ${Platform.Version || ""}`.trim();
        deviceInfo.device_type = Platform.isPad || Platform.isTV ? "tablet" : "mobile";
        console.log("\u2705 [VivosSDK] Collected device info:", {
          os: deviceInfo.device_os,
          type: deviceInfo.device_type
        });
      } else {
        console.log("\u2139\uFE0F [VivosSDK] Platform not detected, using fallback");
        deviceInfo.platform = "react-native";
        deviceInfo.device_type = "mobile";
      }
      if (Dimensions) {
        const { width, height } = Dimensions.get("window");
        deviceInfo.screen_width = Math.round(width);
        deviceInfo.screen_height = Math.round(height);
        console.log("\u2705 [VivosSDK] Screen dimensions:", {
          width: deviceInfo.screen_width,
          height: deviceInfo.screen_height
        });
      } else {
        console.log("\u2139\uFE0F [VivosSDK] Dimensions not detected");
      }
    } catch (error) {
      console.log("\u2139\uFE0F [VivosSDK] Using fallback device info:", error);
      deviceInfo.platform = "react-native";
      deviceInfo.device_type = "mobile";
    }
  } else if (typeof window !== "undefined") {
    deviceInfo.platform = "web";
    deviceInfo.screen_width = window.screen.width;
    deviceInfo.screen_height = window.screen.height;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      deviceInfo.device_type = "mobile";
    } else if (ua.includes("tablet") || ua.includes("ipad")) {
      deviceInfo.device_type = "tablet";
    } else {
      deviceInfo.device_type = "desktop";
    }
    if (ua.includes("android")) {
      deviceInfo.device_os = "Android";
    } else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
      deviceInfo.device_os = "iOS";
    } else if (ua.includes("windows")) {
      deviceInfo.device_os = "Windows";
    } else if (ua.includes("mac")) {
      deviceInfo.device_os = "macOS";
    } else if (ua.includes("linux")) {
      deviceInfo.device_os = "Linux";
    }
  }
  return deviceInfo;
}
async function trackAdImpression(ad, publisherId, host) {
  const canTrack = typeof window !== "undefined" || isReactNative();
  if (!canTrack) return;
  try {
    if (!ad.impression_url) {
      return;
    }
    let trackingUrl = ad.impression_url;
    if (!ad.impression_url.startsWith("http") && host) {
      trackingUrl = `${host}${ad.impression_url.startsWith("/") ? "" : "/"}${ad.impression_url}`;
    }
    if (host && typeof window !== "undefined" && !isReactNative() && typeof window.location !== "undefined") {
      const proxyUrl = new URL("/api/ads/impression", window.location.origin);
      proxyUrl.searchParams.set("url", trackingUrl);
      trackingUrl = proxyUrl.toString();
    }
    const deviceInfo = await getDeviceInfo();
    const payload = {
      keyword: ad.matched_keyword,
      ...deviceInfo
    };
    console.log("\u{1F4E4} [VivosSDK] Tracking URL:", trackingUrl);
    console.log("\u{1F4E4} [VivosSDK] Sending impression with payload:", payload);
    fetch(trackingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).then((response) => {
      console.log("\u2705 [VivosSDK] Impression tracked successfully:", response.status);
      return response.json();
    }).then((data) => {
      console.log("\u2705 [VivosSDK] Server response:", data);
    }).catch((error) => {
      console.error("\u274C [VivosSDK] Failed to track impression:", error);
    });
  } catch {
  }
}
function trackAdClick(ad, publisherId, host) {
  if (typeof window === "undefined") return;
  try {
    if (!ad.click_url) {
      return;
    }
    let trackingUrl = ad.click_url;
    if (host && ad.click_url.startsWith("/")) {
      trackingUrl = `${host}${ad.click_url}`;
    } else if (host && !ad.click_url.startsWith("http")) {
      trackingUrl = `${host}${ad.click_url.startsWith("/") ? "" : "/"}${ad.click_url}`;
    }
    fetch(trackingUrl, {
      method: "GET",
      // Click URLs are typically GET requests
      headers: {
        "Content-Type": "application/json"
      }
    }).catch(() => {
    });
  } catch {
  }
}

// src/components/ChatbotAd.tsx
var import_react2 = require("react");
function ChatbotAd({ publisherId, keyword, host, format = "standard", theme = "dark", renderAd, className }) {
  const { ad, isLoading, error } = useChatbotAd(keyword, publisherId, host);
  const adRef = (0, import_react2.useRef)(null);
  const impressionTracked = (0, import_react2.useRef)(false);
  const isRelevant = Boolean(
    ad && ad.matched_keyword && (() => {
      const keywords = keyword.toLowerCase().split(",").map((k) => k.trim());
      const matchedKeyword = ad.matched_keyword.toLowerCase().trim();
      return keywords.includes(matchedKeyword);
    })()
  );
  const colors = theme === "light" ? {
    background: "#F5F5F5",
    backgroundHover: "#E5E5E5",
    border: "#D1D1D6",
    borderHover: "#C7C7CC",
    text: "#000000",
    textSecondary: "#3C3C43",
    badgeBackground: "#E5E5EA",
    badgeText: "#3C3C43",
    buttonBackground: "#007AFF",
    buttonText: "#FFFFFF",
    buttonHover: "#0051D5"
  } : {
    background: "#2C2C2E",
    backgroundHover: "#343436",
    border: "#38383A",
    borderHover: "#48484A",
    text: "#FFFFFF",
    textSecondary: "#E5E5EA",
    badgeBackground: "#1C1C1E",
    badgeText: "#8E8E93",
    buttonBackground: "#FFFFFF",
    buttonText: "#000000",
    buttonHover: "#F5F5F5"
  };
  (0, import_react2.useEffect)(() => {
    if (!ad || !adRef.current || impressionTracked.current || !isRelevant) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressionTracked.current) {
            impressionTracked.current = true;
            trackAdImpression(ad, publisherId, host);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.5,
        // Track when at least 50% of the ad is visible
        rootMargin: "0px"
      }
    );
    observer.observe(adRef.current);
    return () => {
      observer.disconnect();
    };
  }, [ad, publisherId, host, isRelevant]);
  (0, import_react2.useEffect)(() => {
    impressionTracked.current = false;
  }, [ad?.id]);
  if (isLoading) {
    return null;
  }
  if (error) {
    return null;
  }
  if (!ad || !isRelevant) {
    return null;
  }
  const handleClick = () => {
    trackAdClick(ad, publisherId, host);
    const urlToOpen = ad.click_url || ad.target_url;
    window.open(urlToOpen, "_blank", "noopener,noreferrer");
  };
  if (renderAd) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, renderAd(ad, handleClick));
  }
  const getDomain = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return url;
    }
  };
  const advertiserDomain = ad.advertiser || getDomain(ad.target_url);
  if (format === "small") {
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: adRef,
        className,
        style: {
          padding: "10px 12px",
          margin: "8px 0",
          backgroundColor: colors.background,
          borderRadius: "10px",
          border: `1px solid ${colors.border}`,
          transition: "all 0.2s ease",
          cursor: "pointer"
        },
        onClick: handleClick,
        onMouseEnter: (e) => {
          e.currentTarget.style.backgroundColor = colors.backgroundHover;
          e.currentTarget.style.borderColor = colors.borderHover;
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.backgroundColor = colors.background;
          e.currentTarget.style.borderColor = colors.border;
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: {
        position: "relative"
      } }, /* @__PURE__ */ React.createElement("span", { style: {
        position: "absolute",
        top: 0,
        right: 0,
        fontSize: "10px",
        color: colors.badgeText,
        backgroundColor: colors.badgeBackground,
        padding: "3px 6px",
        borderRadius: "8px",
        fontWeight: "500",
        letterSpacing: "0.2px",
        flexShrink: 0
      } }, "Ad"), /* @__PURE__ */ React.createElement("div", { style: {
        paddingRight: "50px"
        // Space for the Ad badge
      } }, /* @__PURE__ */ React.createElement("strong", { style: {
        fontSize: "13px",
        color: colors.text,
        fontWeight: "600",
        lineHeight: "1.4",
        display: "block",
        marginBottom: "4px"
      } }, ad.title), /* @__PURE__ */ React.createElement("span", { style: {
        fontSize: "13px",
        color: colors.textSecondary,
        lineHeight: "1.4",
        display: "block"
      } }, ad.message)))
    );
  }
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: adRef,
      className,
      style: {
        padding: "12px",
        margin: "8px 0",
        backgroundColor: colors.background,
        borderRadius: "10px",
        border: `1px solid ${colors.border}`,
        transition: "all 0.2s ease"
      },
      onMouseEnter: (e) => {
        e.currentTarget.style.backgroundColor = colors.backgroundHover;
        e.currentTarget.style.borderColor = colors.borderHover;
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.backgroundColor = colors.background;
        e.currentTarget.style.borderColor = colors.border;
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: {
      position: "relative"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "8px"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      flex: 1,
      minWidth: 0
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "6px"
    } }, ad.image_url && /* @__PURE__ */ React.createElement("div", { style: {
      flexShrink: 0,
      width: "36px",
      height: "36px",
      borderRadius: "6px",
      overflow: "hidden",
      backgroundColor: colors.badgeBackground,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    } }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: ad.image_url,
        alt: ad.title,
        style: {
          width: "100%",
          height: "100%",
          objectFit: "cover"
        },
        onError: (e) => {
          e.currentTarget.parentElement.style.display = "none";
        }
      }
    )), /* @__PURE__ */ React.createElement("strong", { style: {
      fontSize: "14px",
      color: colors.text,
      fontWeight: "600",
      lineHeight: "1.3",
      flex: 1,
      minWidth: 0
    } }, ad.title)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: "13px",
      color: colors.textSecondary,
      lineHeight: "1.4",
      display: "block"
    } }, ad.message))), /* @__PURE__ */ React.createElement("div", { style: {
      flexShrink: 0,
      display: "flex",
      alignItems: "center"
    } }, /* @__PURE__ */ React.createElement(
      "a",
      {
        href: ad.click_url || ad.target_url,
        onClick: (e) => {
          e.preventDefault();
          handleClick();
        },
        style: {
          display: "inline-block",
          padding: "8px 20px",
          backgroundColor: colors.buttonBackground,
          color: colors.buttonText,
          border: "none",
          borderRadius: "20px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.2s ease",
          textAlign: "center",
          textDecoration: "none",
          whiteSpace: "nowrap",
          lineHeight: "1.2"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.backgroundColor = colors.buttonHover;
          e.currentTarget.style.transform = "scale(1.02)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.backgroundColor = colors.buttonBackground;
          e.currentTarget.style.transform = "scale(1)";
        }
      },
      "Learn more"
    ))), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      justifyContent: "flex-end"
    } }, /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: "10px",
      color: colors.badgeText,
      backgroundColor: colors.badgeBackground,
      padding: "3px 6px",
      borderRadius: "8px",
      fontWeight: "500",
      letterSpacing: "0.2px",
      flexShrink: 0
    } }, "Ad")))
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatbotAd,
  fetchAd,
  trackAdClick,
  trackAdImpression,
  useChatbotAd
});
