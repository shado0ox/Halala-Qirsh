import { r as __exportAll } from "./rolldown-runtime-DQp2zzRu.js";
// node_modules/@capacitor/core/dist/index.js
/*! Capacitor: https://capacitorjs.com/ - MIT License */
var ExceptionCode;
(function(ExceptionCode) {
	/**
	* API is not implemented.
	*
	* This usually means the API can't be used because it is not implemented for
	* the current platform.
	*/
	ExceptionCode["Unimplemented"] = "UNIMPLEMENTED";
	/**
	* API is not available.
	*
	* This means the API can't be used right now because:
	*   - it is currently missing a prerequisite, such as network connectivity
	*   - it requires a particular platform or browser version
	*/
	ExceptionCode["Unavailable"] = "UNAVAILABLE";
})(ExceptionCode || (ExceptionCode = {}));
var CapacitorException = class extends Error {
	constructor(message, code, data) {
		super(message);
		this.message = message;
		this.code = code;
		this.data = data;
	}
};
var getPlatformId = (win) => {
	var _a, _b;
	if (win === null || win === void 0 ? void 0 : win.androidBridge) return "android";
	else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) return "ios";
	else return "web";
};
var createCapacitor = (win) => {
	const capCustomPlatform = win.CapacitorCustomPlatform || null;
	const cap = win.Capacitor || {};
	const Plugins = cap.Plugins = cap.Plugins || {};
	const getPlatform = () => {
		return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
	};
	const isNativePlatform = () => getPlatform() !== "web";
	const isPluginAvailable = (pluginName) => {
		const plugin = registeredPlugins.get(pluginName);
		if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) return true;
		if (getPluginHeader(pluginName)) return true;
		return false;
	};
	const getPluginHeader = (pluginName) => {
		var _a;
		return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
	};
	const handleError = (err) => win.console.error(err);
	const registeredPlugins = /* @__PURE__ */ new Map();
	const registerPlugin = (pluginName, jsImplementations = {}) => {
		const registeredPlugin = registeredPlugins.get(pluginName);
		if (registeredPlugin) {
			console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
			return registeredPlugin.proxy;
		}
		const platform = getPlatform();
		const pluginHeader = getPluginHeader(pluginName);
		let jsImplementation;
		const loadPluginImplementation = async () => {
			if (!jsImplementation && platform in jsImplementations) jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
			else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
			return jsImplementation;
		};
		const createPluginMethod = (impl, prop) => {
			var _a, _b;
			if (pluginHeader) {
				const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
				if (methodHeader) {
					if (methodHeader.rtype === "promise") return (options) => cap.nativePromise(pluginName, prop.toString(), options);
					else return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
				} else if (impl) return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
			} else if (impl) return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
			else throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
		};
		const createPluginMethodWrapper = (prop) => {
			let remove;
			const wrapper = (...args) => {
				const p = loadPluginImplementation().then((impl) => {
					const fn = createPluginMethod(impl, prop);
					if (fn) {
						const p = fn(...args);
						remove = p === null || p === void 0 ? void 0 : p.remove;
						return p;
					} else throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
				});
				if (prop === "addListener") p.remove = async () => remove();
				return p;
			};
			wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
			Object.defineProperty(wrapper, "name", {
				value: prop,
				writable: false,
				configurable: false
			});
			return wrapper;
		};
		const addListener = createPluginMethodWrapper("addListener");
		const removeListener = createPluginMethodWrapper("removeListener");
		const addListenerNative = (eventName, callback) => {
			const call = addListener({ eventName }, callback);
			const remove = async () => {
				const callbackId = await call;
				removeListener({
					eventName,
					callbackId
				}, callback);
			};
			const p = new Promise((resolve) => call.then(() => resolve({ remove })));
			p.remove = async () => {
				console.warn(`Using addListener() without 'await' is deprecated.`);
				await remove();
			};
			return p;
		};
		const proxy = new Proxy({}, { get(_, prop) {
			switch (prop) {
				case "$$typeof": return;
				case "toJSON": return () => ({});
				case "addListener": return pluginHeader ? addListenerNative : addListener;
				case "removeListener": return removeListener;
				default: return createPluginMethodWrapper(prop);
			}
		} });
		Plugins[pluginName] = proxy;
		registeredPlugins.set(pluginName, {
			name: pluginName,
			proxy,
			platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
		});
		return proxy;
	};
	if (!cap.convertFileSrc) cap.convertFileSrc = (filePath) => filePath;
	cap.getPlatform = getPlatform;
	cap.handleError = handleError;
	cap.isNativePlatform = isNativePlatform;
	cap.isPluginAvailable = isPluginAvailable;
	cap.registerPlugin = registerPlugin;
	cap.Exception = CapacitorException;
	cap.DEBUG = !!cap.DEBUG;
	cap.isLoggingEnabled = !!cap.isLoggingEnabled;
	return cap;
};
var initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
var Capacitor = /*#__PURE__*/ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
var registerPlugin = Capacitor.registerPlugin;
/**
* Base class web plugins should extend.
*/
var WebPlugin = class {
	constructor() {
		this.listeners = {};
		this.retainedEventArguments = {};
		this.windowListeners = {};
	}
	addListener(eventName, listenerFunc) {
		let firstListener = false;
		if (!this.listeners[eventName]) {
			this.listeners[eventName] = [];
			firstListener = true;
		}
		this.listeners[eventName].push(listenerFunc);
		const windowListener = this.windowListeners[eventName];
		if (windowListener && !windowListener.registered) this.addWindowListener(windowListener);
		if (firstListener) this.sendRetainedArgumentsForEvent(eventName);
		const remove = async () => this.removeListener(eventName, listenerFunc);
		return Promise.resolve({ remove });
	}
	async removeAllListeners() {
		this.listeners = {};
		for (const listener in this.windowListeners) this.removeWindowListener(this.windowListeners[listener]);
		this.windowListeners = {};
	}
	notifyListeners(eventName, data, retainUntilConsumed) {
		const listeners = this.listeners[eventName];
		if (!listeners) {
			if (retainUntilConsumed) {
				let args = this.retainedEventArguments[eventName];
				if (!args) args = [];
				args.push(data);
				this.retainedEventArguments[eventName] = args;
			}
			return;
		}
		listeners.forEach((listener) => listener(data));
	}
	hasListeners(eventName) {
		var _a;
		return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
	}
	registerWindowListener(windowEventName, pluginEventName) {
		this.windowListeners[pluginEventName] = {
			registered: false,
			windowEventName,
			pluginEventName,
			handler: (event) => {
				this.notifyListeners(pluginEventName, event);
			}
		};
	}
	unimplemented(msg = "not implemented") {
		return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
	}
	unavailable(msg = "not available") {
		return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
	}
	async removeListener(eventName, listenerFunc) {
		const listeners = this.listeners[eventName];
		if (!listeners) return;
		const index = listeners.indexOf(listenerFunc);
		if (index !== -1) this.listeners[eventName].splice(index, 1);
		if (!this.listeners[eventName].length) this.removeWindowListener(this.windowListeners[eventName]);
	}
	addWindowListener(handle) {
		window.addEventListener(handle.windowEventName, handle.handler);
		handle.registered = true;
	}
	removeWindowListener(handle) {
		if (!handle) return;
		window.removeEventListener(handle.windowEventName, handle.handler);
		handle.registered = false;
	}
	sendRetainedArgumentsForEvent(eventName) {
		const args = this.retainedEventArguments[eventName];
		if (!args) return;
		delete this.retainedEventArguments[eventName];
		args.forEach((arg) => {
			this.notifyListeners(eventName, arg);
		});
	}
};
/******** END WEB VIEW PLUGIN ********/
/******** COOKIES PLUGIN ********/
/**
* Safely web encode a string value (inspired by js-cookie)
* @param str The string value to encode
*/
var encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
/**
* Safely web decode a string value (inspired by js-cookie)
* @param str The string value to decode
*/
var decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
var CapacitorCookiesPluginWeb = class extends WebPlugin {
	async getCookies() {
		const cookies = document.cookie;
		const cookieMap = {};
		cookies.split(";").forEach((cookie) => {
			if (cookie.length <= 0) return;
			let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
			key = decode(key).trim();
			value = decode(value).trim();
			cookieMap[key] = value;
		});
		return cookieMap;
	}
	async setCookie(options) {
		try {
			const encodedKey = encode(options.key);
			const encodedValue = encode(options.value);
			const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
			const path = (options.path || "/").replace("path=", "");
			const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
			document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
		} catch (error) {
			return Promise.reject(error);
		}
	}
	async deleteCookie(options) {
		try {
			document.cookie = `${options.key}=; Max-Age=0`;
		} catch (error) {
			return Promise.reject(error);
		}
	}
	async clearCookies() {
		try {
			const cookies = document.cookie.split(";") || [];
			for (const cookie of cookies) document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
		} catch (error) {
			return Promise.reject(error);
		}
	}
	async clearAllCookies() {
		try {
			await this.clearCookies();
		} catch (error) {
			return Promise.reject(error);
		}
	}
};
registerPlugin("CapacitorCookies", { web: () => new CapacitorCookiesPluginWeb() });
/**
* Read in a Blob value and return it as a base64 string
* @param blob The blob value to convert to a base64 string
*/
var readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
	const reader = new FileReader();
	reader.onload = () => {
		const base64String = reader.result;
		resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
	};
	reader.onerror = (error) => reject(error);
	reader.readAsDataURL(blob);
});
/**
* Normalize an HttpHeaders map by lowercasing all of the values
* @param headers The HttpHeaders object to normalize
*/
var normalizeHttpHeaders = (headers = {}) => {
	const originalKeys = Object.keys(headers);
	return Object.keys(headers).map((k) => k.toLocaleLowerCase()).reduce((acc, key, index) => {
		acc[key] = headers[originalKeys[index]];
		return acc;
	}, {});
};
/**
* Builds a string of url parameters that
* @param params A map of url parameters
* @param shouldEncode true if you should encodeURIComponent() the values (true by default)
*/
var buildUrlParams = (params, shouldEncode = true) => {
	if (!params) return null;
	return Object.entries(params).reduce((accumulator, entry) => {
		const [key, value] = entry;
		let encodedValue;
		let item;
		if (Array.isArray(value)) {
			item = "";
			value.forEach((str) => {
				encodedValue = shouldEncode ? encodeURIComponent(str) : str;
				item += `${key}=${encodedValue}&`;
			});
			item.slice(0, -1);
		} else {
			encodedValue = shouldEncode ? encodeURIComponent(value) : value;
			item = `${key}=${encodedValue}`;
		}
		return `${accumulator}&${item}`;
	}, "").substr(1);
};
/**
* Build the RequestInit object based on the options passed into the initial request
* @param options The Http plugin options
* @param extra Any extra RequestInit values
*/
var buildRequestInit = (options, extra = {}) => {
	const output = Object.assign({
		method: options.method || "GET",
		headers: options.headers
	}, extra);
	const type = normalizeHttpHeaders(options.headers)["content-type"] || "";
	if (typeof options.data === "string") output.body = options.data;
	else if (type.includes("application/x-www-form-urlencoded")) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(options.data || {})) params.set(key, value);
		output.body = params.toString();
	} else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
		const form = new FormData();
		if (options.data instanceof FormData) options.data.forEach((value, key) => {
			form.append(key, value);
		});
		else for (const key of Object.keys(options.data)) form.append(key, options.data[key]);
		output.body = form;
		const headers = new Headers(output.headers);
		headers.delete("content-type");
		output.headers = headers;
	} else if (type.includes("application/json") || typeof options.data === "object") output.body = JSON.stringify(options.data);
	return output;
};
var CapacitorHttpPluginWeb = class extends WebPlugin {
	/**
	* Perform an Http request given a set of options
	* @param options Options to build the HTTP request
	*/
	async request(options) {
		const requestInit = buildRequestInit(options, options.webFetchExtra);
		const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
		const url = urlParams ? `${options.url}?${urlParams}` : options.url;
		const response = await fetch(url, requestInit);
		const contentType = response.headers.get("content-type") || "";
		let { responseType = "text" } = response.ok ? options : {};
		if (contentType.includes("application/json")) responseType = "json";
		let data;
		let blob;
		switch (responseType) {
			case "arraybuffer":
			case "blob":
				blob = await response.blob();
				data = await readBlobAsBase64(blob);
				break;
			case "json":
				data = await response.json();
				break;
			default: data = await response.text();
		}
		const headers = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});
		return {
			data,
			headers,
			status: response.status,
			url: response.url
		};
	}
	/**
	* Perform an Http GET request given a set of options
	* @param options Options to build the HTTP request
	*/
	async get(options) {
		return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
	}
	/**
	* Perform an Http POST request given a set of options
	* @param options Options to build the HTTP request
	*/
	async post(options) {
		return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
	}
	/**
	* Perform an Http PUT request given a set of options
	* @param options Options to build the HTTP request
	*/
	async put(options) {
		return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
	}
	/**
	* Perform an Http PATCH request given a set of options
	* @param options Options to build the HTTP request
	*/
	async patch(options) {
		return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
	}
	/**
	* Perform an Http DELETE request given a set of options
	* @param options Options to build the HTTP request
	*/
	async delete(options) {
		return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
	}
};
registerPlugin("CapacitorHttp", { web: () => new CapacitorHttpPluginWeb() });
/******** END HTTP PLUGIN ********/
/******** SYSTEM BARS PLUGIN ********/
/**
* Available status bar styles.
*/
var SystemBarsStyle;
(function(SystemBarsStyle) {
	/**
	* Light system bar content on a dark background.
	*
	* @since 8.0.0
	*/
	SystemBarsStyle["Dark"] = "DARK";
	/**
	* For dark system bar content on a light background.
	*
	* @since 8.0.0
	*/
	SystemBarsStyle["Light"] = "LIGHT";
	/**
	* The style is based on the device appearance or the underlying content.
	* If the device is using Dark mode, the system bars content will be light.
	* If the device is using Light mode, the system bars content will be dark.
	*
	* @since 8.0.0
	*/
	SystemBarsStyle["Default"] = "DEFAULT";
})(SystemBarsStyle || (SystemBarsStyle = {}));
/**
* Available system bar types.
*/
var SystemBarType;
(function(SystemBarType) {
	/**
	* The top status bar on both Android and iOS.
	*
	* @since 8.0.0
	*/
	SystemBarType["StatusBar"] = "StatusBar";
	/**
	* The navigation bar (or gesture bar on iOS) on both Android and iOS.
	*
	* @since 8.0.0
	*/
	SystemBarType["NavigationBar"] = "NavigationBar";
})(SystemBarType || (SystemBarType = {}));
var SystemBarsPluginWeb = class extends WebPlugin {
	async setStyle() {
		this.unavailable("not available for web");
	}
	async setAnimation() {
		this.unavailable("not available for web");
	}
	async show() {
		this.unavailable("not available for web");
	}
	async hide() {
		this.unavailable("not available for web");
	}
};
registerPlugin("SystemBars", { web: () => new SystemBarsPluginWeb() });
// node_modules/@capacitor/status-bar/dist/esm/definitions.js
var Style;
(function(Style) {
	/**
	* Light text for dark backgrounds.
	*
	* @since 1.0.0
	*/
	Style["Dark"] = "DARK";
	/**
	* Dark text for light backgrounds.
	*
	* @since 1.0.0
	*/
	Style["Light"] = "LIGHT";
	/**
	* The style is based on the device appearance.
	* If the device is using Dark mode, the statusbar text will be light.
	* If the device is using Light mode, the statusbar text will be dark.
	*
	* @since 1.0.0
	*/
	Style["Default"] = "DEFAULT";
})(Style || (Style = {}));
var Animation;
(function(Animation) {
	/**
	* No animation during show/hide.
	*
	* @since 1.0.0
	*/
	Animation["None"] = "NONE";
	/**
	* Slide animation during show/hide.
	* It doesn't work on iOS 15+.
	*
	* @deprecated Use Animation.Fade or Animation.None instead.
	*
	* @since 1.0.0
	*/
	Animation["Slide"] = "SLIDE";
	/**
	* Fade animation during show/hide.
	*
	* @since 1.0.0
	*/
	Animation["Fade"] = "FADE";
})(Animation || (Animation = {}));
// node_modules/@capacitor/status-bar/dist/esm/index.js
var StatusBar = registerPlugin("StatusBar");
// \0vite/preload-helper.js
var scriptRel = "modulepreload";
var assetsURL = function(dep) {
	return "/" + dep;
};
var seen = {};
var isCssPreloadUrl = function isCssPreloadUrl(url) {
	return url.pathname.endsWith(".css");
};
var preloadOnce = function preloadOnce(seen, href, preload) {
	if (href in seen) return seen[href];
	const promise = preload();
	if (!promise) {
		seen[href] = void 0;
		return;
	}
	const preloadPromise = promise.then(() => {
		seen[href] = void 0;
	}, (err) => {
		seen[href] = void 0;
		throw err;
	});
	seen[href] = preloadPromise;
	return preloadPromise;
};
var __vitePreload = function preload(baseModule, deps, importerUrl) {
	let promise = Promise.resolve();
	if (deps && deps.length > 0) {
		let preloadedHrefs;
		const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
		const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
		function allSettled(promises) {
			return Promise.all(promises.map((p) => Promise.resolve(p).then((value) => ({
				status: "fulfilled",
				value
			}), (reason) => ({
				status: "rejected",
				reason
			}))));
		}
		function importMetaResolve(specifier) {
			if (import.meta.resolve) return new URL(import.meta.resolve(specifier));
			return new URL(
				specifier,
				/** #__KEEP__ */
				import.meta.url
			);
		}
		promise = allSettled(deps.map((depString) => {
			depString = assetsURL(depString, importerUrl);
			const dep = importMetaResolve(depString);
			const isCss = isCssPreloadUrl(dep);
			return preloadOnce(seen, dep.href, () => {
				if (preloadedHrefs === void 0) {
					preloadedHrefs = {
						all: /* @__PURE__ */ new Set(),
						styles: /* @__PURE__ */ new Set()
					};
					const links = document.getElementsByTagName("link");
					for (let i = links.length - 1; i >= 0; i--) {
						const link = links[i];
						preloadedHrefs.all.add(link.href);
						if (link.rel === "stylesheet") preloadedHrefs.styles.add(link.href);
					}
				}
				if ((isCss ? preloadedHrefs.styles : preloadedHrefs.all).has(dep.href)) return;
				const link = document.createElement("link");
				link.rel = isCss ? "stylesheet" : scriptRel;
				if (!isCss) link.as = "script";
				link.crossOrigin = "";
				link.href = dep.href;
				if (cspNonce) link.setAttribute("nonce", cspNonce);
				document.head.appendChild(link);
				if (isCss) return new Promise((res, rej) => {
					link.addEventListener("load", res);
					link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
				});
			});
		}).filter((p) => p !== void 0));
	}
	function handlePreloadError(err) {
		const e = new Event("vite:preloadError", { cancelable: true });
		e.payload = err;
		window.dispatchEvent(e);
		if (!e.defaultPrevented) throw err;
	}
	return promise.then((res) => {
		for (const item of res || []) {
			if (item.status !== "rejected") continue;
			handlePreloadError(item.reason);
		}
		return baseModule().catch(handlePreloadError);
	});
};
// node_modules/@capacitor/preferences/dist/esm/index.js
var Preferences = registerPlugin("Preferences", { web: () => __vitePreload(() => Promise.resolve().then(() => web_exports$1).then((m) => new m.PreferencesWeb()), void 0) });
// node_modules/@capacitor/share/dist/esm/index.js
var Share = registerPlugin("Share", { web: () => __vitePreload(() => Promise.resolve().then(() => web_exports).then((m) => new m.ShareWeb()), void 0) });
// node_modules/@capacitor/synapse/dist/synapse.mjs
function s(t) {
	t.CapacitorUtils.Synapse = new Proxy({}, { get(e, n) {
		return new Proxy({}, { get(w, o) {
			return (c, p, r) => {
				const i = t.Capacitor.Plugins[n];
				if (i === void 0) {
					r(/* @__PURE__ */ new Error(`Capacitor plugin ${n} not found`));
					return;
				}
				if (typeof i[o] != "function") {
					r(/* @__PURE__ */ new Error(`Method ${o} not found in Capacitor plugin ${n}`));
					return;
				}
				(async () => {
					try {
						p(await i[o](c));
					} catch (a) {
						r(a);
					}
				})();
			};
		} });
	} });
}
function u(t) {
	t.CapacitorUtils.Synapse = new Proxy({}, { get(e, n) {
		return t.cordova.plugins[n];
	} });
}
function f(t = !1) {
	typeof window > "u" || (window.CapacitorUtils = window.CapacitorUtils || {}, window.Capacitor !== void 0 && !t ? s(window) : window.cordova !== void 0 && u(window));
}
// node_modules/@capacitor/filesystem/dist/esm/definitions.js
var Directory;
(function(Directory) {
	/**
	* The Documents directory.
	* On iOS it's the app's documents directory.
	* Use this directory to store user-generated content.
	* On Android it's the Public Documents folder, so it's accessible from other apps.
	* It's not accessible on Android 10 unless the app enables legacy External Storage
	* by adding `android:requestLegacyExternalStorage="true"` in the `application` tag
	* in the `AndroidManifest.xml`.
	* On Android 11 or newer the app can only access the files/folders the app created.
	*
	* @since 1.0.0
	*/
	Directory["Documents"] = "DOCUMENTS";
	/**
	* The Data directory.
	* On iOS it will use the Documents directory.
	* On Android it's the directory holding application files.
	* Files will be deleted when the application is uninstalled.
	*
	* @since 1.0.0
	*/
	Directory["Data"] = "DATA";
	/**
	* The Library directory.
	* On iOS it will use the Library directory.
	* On Android it's the directory holding application files.
	* Files will be deleted when the application is uninstalled.
	*
	* @since 1.1.0
	*/
	Directory["Library"] = "LIBRARY";
	/**
	* The Cache directory.
	* Can be deleted in cases of low memory, so use this directory to write app-specific files.
	* that your app can re-create easily.
	*
	* @since 1.0.0
	*/
	Directory["Cache"] = "CACHE";
	/**
	* The external directory.
	* On iOS it will use the Documents directory.
	* On Android it's the directory on the primary shared/external
	* storage device where the application can place persistent files it owns.
	* These files are internal to the applications, and not typically visible
	* to the user as media.
	* Files will be deleted when the application is uninstalled.
	*
	* @since 1.0.0
	*/
	Directory["External"] = "EXTERNAL";
	/**
	* The external storage directory.
	* On iOS it will use the Documents directory.
	* On Android it's the primary shared/external storage directory.
	* It's not accessible on Android 10 unless the app enables legacy External Storage
	* by adding `android:requestLegacyExternalStorage="true"` in the `application` tag
	* in the `AndroidManifest.xml`.
	* It's not accessible on Android 11 or newer.
	*
	* @since 1.0.0
	*/
	Directory["ExternalStorage"] = "EXTERNAL_STORAGE";
	/**
	* The external cache directory.
	* On iOS it will use the Documents directory.
	* On Android it's the primary shared/external cache.
	*
	* @since 7.1.0
	*/
	Directory["ExternalCache"] = "EXTERNAL_CACHE";
	/**
	* The Library directory without cloud backup. Used in iOS.
	* On Android it's the directory holding application files.
	*
	* @since 7.1.0
	*/
	Directory["LibraryNoCloud"] = "LIBRARY_NO_CLOUD";
	/**
	* A temporary directory for iOS.
	* On Android it's the directory holding the application cache.
	*
	* @since 7.1.0
	*/
	Directory["Temporary"] = "TEMPORARY";
})(Directory || (Directory = {}));
var Encoding;
(function(Encoding) {
	/**
	* Eight-bit UCS Transformation Format
	*
	* @since 1.0.0
	*/
	Encoding["UTF8"] = "utf8";
	/**
	* Seven-bit ASCII, a.k.a. ISO646-US, a.k.a. the Basic Latin block of the
	* Unicode character set
	* This encoding is only supported on Android.
	*
	* @since 1.0.0
	*/
	Encoding["ASCII"] = "ascii";
	/**
	* Sixteen-bit UCS Transformation Format, byte order identified by an
	* optional byte-order mark
	* This encoding is only supported on Android.
	*
	* @since 1.0.0
	*/
	Encoding["UTF16"] = "utf16";
})(Encoding || (Encoding = {}));
// node_modules/@capacitor/filesystem/dist/esm/index.js
var Filesystem = registerPlugin("Filesystem", { web: () => __vitePreload(() => Promise.resolve().then(() => web_exports$4).then((m) => new m.FilesystemWeb()), void 0) });
f();
// node_modules/@capacitor/haptics/dist/esm/definitions.js
var ImpactStyle;
(function(ImpactStyle) {
	/**
	* A collision between large, heavy user interface elements
	*
	* @since 1.0.0
	*/
	ImpactStyle["Heavy"] = "HEAVY";
	/**
	* A collision between moderately sized user interface elements
	*
	* @since 1.0.0
	*/
	ImpactStyle["Medium"] = "MEDIUM";
	/**
	* A collision between small, light user interface elements
	*
	* @since 1.0.0
	*/
	ImpactStyle["Light"] = "LIGHT";
})(ImpactStyle || (ImpactStyle = {}));
var NotificationType;
(function(NotificationType) {
	/**
	* A notification feedback type indicating that a task has completed successfully
	*
	* @since 1.0.0
	*/
	NotificationType["Success"] = "SUCCESS";
	/**
	* A notification feedback type indicating that a task has produced a warning
	*
	* @since 1.0.0
	*/
	NotificationType["Warning"] = "WARNING";
	/**
	* A notification feedback type indicating that a task has failed
	*
	* @since 1.0.0
	*/
	NotificationType["Error"] = "ERROR";
})(NotificationType || (NotificationType = {}));
// node_modules/@capacitor/haptics/dist/esm/index.js
var Haptics = registerPlugin("Haptics", { web: () => __vitePreload(() => Promise.resolve().then(() => web_exports$3).then((m) => new m.HapticsWeb()), void 0) });
// node_modules/@capacitor/local-notifications/dist/esm/definitions.js
/**
* Day of the week. Used for scheduling notifications on a particular weekday.
*/
var Weekday;
(function(Weekday) {
	Weekday[Weekday["Sunday"] = 1] = "Sunday";
	Weekday[Weekday["Monday"] = 2] = "Monday";
	Weekday[Weekday["Tuesday"] = 3] = "Tuesday";
	Weekday[Weekday["Wednesday"] = 4] = "Wednesday";
	Weekday[Weekday["Thursday"] = 5] = "Thursday";
	Weekday[Weekday["Friday"] = 6] = "Friday";
	Weekday[Weekday["Saturday"] = 7] = "Saturday";
})(Weekday || (Weekday = {}));
// node_modules/@capacitor/local-notifications/dist/esm/index.js
var LocalNotifications = registerPlugin("LocalNotifications", { web: () => __vitePreload(() => Promise.resolve().then(() => web_exports$2).then((m) => new m.LocalNotificationsWeb()), void 0) });
// node_modules/@capacitor/app/dist/esm/index.js
var App = registerPlugin("App", { web: () => __vitePreload(() => Promise.resolve().then(() => web_exports$5).then((m) => new m.AppWeb()), void 0) });
// node_modules/@capacitor/keyboard/dist/esm/definitions.js
var KeyboardStyle;
(function(KeyboardStyle) {
	/**
	* Dark keyboard.
	*
	* @since 1.0.0
	*/
	KeyboardStyle["Dark"] = "DARK";
	/**
	* Light keyboard.
	*
	* @since 1.0.0
	*/
	KeyboardStyle["Light"] = "LIGHT";
	/**
	* The keyboard style is based on the device appearance.
	* If the device is using Dark mode, the keyboard will be dark.
	* If the device is using Light mode, the keyboard will be light.
	*
	* @since 1.0.0
	*/
	KeyboardStyle["Default"] = "DEFAULT";
})(KeyboardStyle || (KeyboardStyle = {}));
var KeyboardResize;
(function(KeyboardResize) {
	/**
	* Only the `body` HTML element will be resized.
	* Relative units are not affected, because the viewport does not change.
	*
	* @since 1.0.0
	*/
	KeyboardResize["Body"] = "body";
	/**
	* Only the `ion-app` HTML element will be resized.
	* Use it only for Ionic Framework apps.
	*
	* @since 1.0.0
	*/
	KeyboardResize["Ionic"] = "ionic";
	/**
	* The whole native Web View will be resized when the keyboard shows/hides.
	* This affects the `vh` relative unit.
	*
	* @since 1.0.0
	*/
	KeyboardResize["Native"] = "native";
	/**
	* Neither the app nor the Web View are resized.
	*
	* @since 1.0.0
	*/
	KeyboardResize["None"] = "none";
})(KeyboardResize || (KeyboardResize = {}));
// node_modules/@capacitor/keyboard/dist/esm/index.js
var Keyboard = registerPlugin("Keyboard");
// node_modules/@capacitor/clipboard/dist/esm/web.js
var ClipboardWeb = class extends WebPlugin {
	async write(options) {
		if (typeof navigator === "undefined" || !navigator.clipboard) throw this.unavailable("Clipboard API not available in this browser");
		if (options.string !== void 0) await this.writeText(options.string);
		else if (options.url) await this.writeText(options.url);
		else if (options.image) {
			if (typeof ClipboardItem !== "undefined") try {
				const blob = await (await fetch(options.image)).blob();
				const clipboardItemInput = new ClipboardItem({ [blob.type]: blob });
				await navigator.clipboard.write([clipboardItemInput]);
			} catch (err) {
				throw new Error("Failed to write image");
			}
			else throw this.unavailable("Writing images to the clipboard is not supported in this browser");
		} else throw new Error("Nothing to write");
	}
	async read() {
		if (typeof navigator === "undefined" || !navigator.clipboard) throw this.unavailable("Clipboard API not available in this browser");
		if (typeof ClipboardItem !== "undefined") try {
			const clipboardItems = await navigator.clipboard.read();
			const type = clipboardItems[0].types[0];
			const clipboardBlob = await clipboardItems[0].getType(type);
			return {
				value: await this._getBlobData(clipboardBlob, type),
				type
			};
		} catch (err) {
			return this.readText();
		}
		else return this.readText();
	}
	async readText() {
		if (typeof navigator === "undefined" || !navigator.clipboard || !navigator.clipboard.readText) throw this.unavailable("Reading from clipboard not supported in this browser");
		return {
			value: await navigator.clipboard.readText(),
			type: "text/plain"
		};
	}
	async writeText(text) {
		if (typeof navigator === "undefined" || !navigator.clipboard || !navigator.clipboard.writeText) throw this.unavailable("Writting to clipboard not supported in this browser");
		await navigator.clipboard.writeText(text);
	}
	_getBlobData(clipboardBlob, type) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			if (type.includes("image")) reader.readAsDataURL(clipboardBlob);
			else reader.readAsText(clipboardBlob);
			reader.onloadend = () => {
				const r = reader.result;
				resolve(r);
			};
			reader.onerror = (e) => {
				reject(e);
			};
		});
	}
};
// node_modules/@capacitor/clipboard/dist/esm/index.js
var Clipboard = registerPlugin("Clipboard", { web: () => new ClipboardWeb() });
// node_modules/@capacitor/app-launcher/dist/esm/web.js
var web_exports$6 = /* @__PURE__ */ __exportAll({ AppLauncherWeb: () => AppLauncherWeb });
var AppLauncherWeb = class extends WebPlugin {
	async canOpenUrl(_options) {
		return { value: true };
	}
	async openUrl(options) {
		window.open(options.url, "_blank");
		return { completed: true };
	}
};
// node_modules/@capacitor/app/dist/esm/web.js
var web_exports$5 = /* @__PURE__ */ __exportAll({ AppWeb: () => AppWeb });
var AppWeb = class extends WebPlugin {
	constructor() {
		super();
		this.handleVisibilityChange = () => {
			const data = { isActive: document.hidden !== true };
			this.notifyListeners("appStateChange", data);
			if (document.hidden) this.notifyListeners("pause", null);
			else this.notifyListeners("resume", null);
		};
		document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
	}
	exitApp() {
		throw this.unimplemented("Not implemented on web.");
	}
	async getInfo() {
		throw this.unimplemented("Not implemented on web.");
	}
	async getLaunchUrl() {
		return { url: "" };
	}
	async getState() {
		return { isActive: document.hidden !== true };
	}
	async minimizeApp() {
		throw this.unimplemented("Not implemented on web.");
	}
	async toggleBackButtonHandler() {
		throw this.unimplemented("Not implemented on web.");
	}
	async getAppLanguage() {
		return { value: navigator.language.split("-")[0].toLowerCase() };
	}
};
// node_modules/@capacitor/filesystem/dist/esm/web.js
var web_exports$4 = /* @__PURE__ */ __exportAll({ FilesystemWeb: () => FilesystemWeb });
function resolve(path) {
	const posix = path.split("/").filter((item) => item !== ".");
	const newPosix = [];
	posix.forEach((item) => {
		if (item === ".." && newPosix.length > 0 && newPosix[newPosix.length - 1] !== "..") newPosix.pop();
		else newPosix.push(item);
	});
	return newPosix.join("/");
}
function isPathParent(parent, children) {
	parent = resolve(parent);
	children = resolve(children);
	const pathsA = parent.split("/");
	const pathsB = children.split("/");
	return parent !== children && pathsA.every((value, index) => value === pathsB[index]);
}
var FilesystemWeb = class FilesystemWeb extends WebPlugin {
	constructor() {
		super(...arguments);
		this.DB_VERSION = 1;
		this.DB_NAME = "Disc";
		this._writeCmds = [
			"add",
			"put",
			"delete"
		];
		/**
		* Function that performs a http request to a server and downloads the file to the specified destination
		*
		* @deprecated Use the @capacitor/file-transfer plugin instead.
		* @param options the options for the download operation
		* @returns a promise that resolves with the download file result
		*/
		this.downloadFile = async (options) => {
			var _a, _b;
			const requestInit = buildRequestInit(options, options.webFetchExtra);
			const response = await fetch(options.url, requestInit);
			let blob;
			if (!options.progress) blob = await response.blob();
			else if (!(response === null || response === void 0 ? void 0 : response.body)) blob = new Blob();
			else {
				const reader = response.body.getReader();
				let bytes = 0;
				const chunks = [];
				const contentType = response.headers.get("content-type");
				const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					chunks.push(value);
					bytes += (value === null || value === void 0 ? void 0 : value.length) || 0;
					const status = {
						url: options.url,
						bytes,
						contentLength
					};
					this.notifyListeners("progress", status);
				}
				const allChunks = new Uint8Array(bytes);
				let position = 0;
				for (const chunk of chunks) {
					if (typeof chunk === "undefined") continue;
					allChunks.set(chunk, position);
					position += chunk.length;
				}
				blob = new Blob([allChunks.buffer], { type: contentType || void 0 });
			}
			return {
				path: (await this.writeFile({
					path: options.path,
					directory: (_a = options.directory) !== null && _a !== void 0 ? _a : void 0,
					recursive: (_b = options.recursive) !== null && _b !== void 0 ? _b : false,
					data: blob
				})).uri,
				blob
			};
		};
	}
	readFileInChunks(_options, _callback) {
		throw this.unavailable("Method not implemented.");
	}
	async initDb() {
		if (this._db !== void 0) return this._db;
		if (!("indexedDB" in window)) throw this.unavailable("This browser doesn't support IndexedDB");
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
			request.onupgradeneeded = FilesystemWeb.doUpgrade;
			request.onsuccess = () => {
				this._db = request.result;
				resolve(request.result);
			};
			request.onerror = () => reject(request.error);
			request.onblocked = () => {
				console.warn("db blocked");
			};
		});
	}
	static doUpgrade(event) {
		const db = event.target.result;
		switch (event.oldVersion) {
			default:
				if (db.objectStoreNames.contains("FileStorage")) db.deleteObjectStore("FileStorage");
				db.createObjectStore("FileStorage", { keyPath: "path" }).createIndex("by_folder", "folder");
		}
	}
	async dbRequest(cmd, args) {
		const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
		return this.initDb().then((conn) => {
			return new Promise((resolve, reject) => {
				const req = conn.transaction(["FileStorage"], readFlag).objectStore("FileStorage")[cmd](...args);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
		});
	}
	async dbIndexRequest(indexName, cmd, args) {
		const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
		return this.initDb().then((conn) => {
			return new Promise((resolve, reject) => {
				const req = conn.transaction(["FileStorage"], readFlag).objectStore("FileStorage").index(indexName)[cmd](...args);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
		});
	}
	getPath(directory, uriPath) {
		const cleanedUriPath = uriPath !== void 0 ? uriPath.replace(/^[/]+|[/]+$/g, "") : "";
		let fsPath = "";
		if (directory !== void 0) fsPath += "/" + directory;
		if (uriPath !== "") fsPath += "/" + cleanedUriPath;
		return fsPath;
	}
	async clear() {
		(await this.initDb()).transaction(["FileStorage"], "readwrite").objectStore("FileStorage").clear();
	}
	/**
	* Read a file from disk
	* @param options options for the file read
	* @return a promise that resolves with the read file data result
	*/
	async readFile(options) {
		const path = this.getPath(options.directory, options.path);
		const entry = await this.dbRequest("get", [path]);
		if (entry === void 0) throw Error("File does not exist.");
		return { data: entry.content ? entry.content : "" };
	}
	/**
	* Write a file to disk in the specified location on device
	* @param options options for the file write
	* @return a promise that resolves with the file write result
	*/
	async writeFile(options) {
		const path = this.getPath(options.directory, options.path);
		let data = options.data;
		const encoding = options.encoding;
		const doRecursive = options.recursive;
		const occupiedEntry = await this.dbRequest("get", [path]);
		if (occupiedEntry && occupiedEntry.type === "directory") throw Error("The supplied path is a directory.");
		const parentPath = path.substr(0, path.lastIndexOf("/"));
		if (await this.dbRequest("get", [parentPath]) === void 0) {
			const subDirIndex = parentPath.indexOf("/", 1);
			if (subDirIndex !== -1) {
				const parentArgPath = parentPath.substr(subDirIndex);
				await this.mkdir({
					path: parentArgPath,
					directory: options.directory,
					recursive: doRecursive
				});
			}
		}
		if (!encoding && !(data instanceof Blob)) {
			data = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
			if (!this.isBase64String(data)) throw Error("The supplied data is not valid base64 content.");
		}
		const now = Date.now();
		const pathObj = {
			path,
			folder: parentPath,
			type: "file",
			size: data instanceof Blob ? data.size : data.length,
			ctime: now,
			mtime: now,
			content: data
		};
		await this.dbRequest("put", [pathObj]);
		return { uri: pathObj.path };
	}
	/**
	* Append to a file on disk in the specified location on device
	* @param options options for the file append
	* @return a promise that resolves with the file write result
	*/
	async appendFile(options) {
		const path = this.getPath(options.directory, options.path);
		let data = options.data;
		const encoding = options.encoding;
		const parentPath = path.substr(0, path.lastIndexOf("/"));
		const now = Date.now();
		let ctime = now;
		const occupiedEntry = await this.dbRequest("get", [path]);
		if (occupiedEntry && occupiedEntry.type === "directory") throw Error("The supplied path is a directory.");
		if (await this.dbRequest("get", [parentPath]) === void 0) {
			const subDirIndex = parentPath.indexOf("/", 1);
			if (subDirIndex !== -1) {
				const parentArgPath = parentPath.substr(subDirIndex);
				await this.mkdir({
					path: parentArgPath,
					directory: options.directory,
					recursive: true
				});
			}
		}
		if (!encoding && !this.isBase64String(data)) throw Error("The supplied data is not valid base64 content.");
		if (occupiedEntry !== void 0) {
			if (occupiedEntry.content instanceof Blob) throw Error("The occupied entry contains a Blob object which cannot be appended to.");
			if (occupiedEntry.content !== void 0 && !encoding) data = btoa(atob(occupiedEntry.content) + atob(data));
			else data = occupiedEntry.content + data;
			ctime = occupiedEntry.ctime;
		}
		const pathObj = {
			path,
			folder: parentPath,
			type: "file",
			size: data.length,
			ctime,
			mtime: now,
			content: data
		};
		await this.dbRequest("put", [pathObj]);
	}
	/**
	* Delete a file from disk
	* @param options options for the file delete
	* @return a promise that resolves with the deleted file data result
	*/
	async deleteFile(options) {
		const path = this.getPath(options.directory, options.path);
		if (await this.dbRequest("get", [path]) === void 0) throw Error("File does not exist.");
		if ((await this.dbIndexRequest("by_folder", "getAllKeys", [IDBKeyRange.only(path)])).length !== 0) throw Error("Folder is not empty.");
		await this.dbRequest("delete", [path]);
	}
	/**
	* Create a directory.
	* @param options options for the mkdir
	* @return a promise that resolves with the mkdir result
	*/
	async mkdir(options) {
		const path = this.getPath(options.directory, options.path);
		const doRecursive = options.recursive;
		const parentPath = path.substr(0, path.lastIndexOf("/"));
		const depth = (path.match(/\//g) || []).length;
		const parentEntry = await this.dbRequest("get", [parentPath]);
		const occupiedEntry = await this.dbRequest("get", [path]);
		if (depth === 1) throw Error("Cannot create Root directory");
		if (occupiedEntry !== void 0) throw Error("Current directory does already exist.");
		if (!doRecursive && depth !== 2 && parentEntry === void 0) throw Error("Parent directory must exist");
		if (doRecursive && depth !== 2 && parentEntry === void 0) {
			const parentArgPath = parentPath.substr(parentPath.indexOf("/", 1));
			await this.mkdir({
				path: parentArgPath,
				directory: options.directory,
				recursive: doRecursive
			});
		}
		const now = Date.now();
		const pathObj = {
			path,
			folder: parentPath,
			type: "directory",
			size: 0,
			ctime: now,
			mtime: now
		};
		await this.dbRequest("put", [pathObj]);
	}
	/**
	* Remove a directory
	* @param options the options for the directory remove
	*/
	async rmdir(options) {
		const { path, directory, recursive } = options;
		const fullPath = this.getPath(directory, path);
		const entry = await this.dbRequest("get", [fullPath]);
		if (entry === void 0) throw Error("Folder does not exist.");
		if (entry.type !== "directory") throw Error("Requested path is not a directory");
		const readDirResult = await this.readdir({
			path,
			directory
		});
		if (readDirResult.files.length !== 0 && !recursive) throw Error("Folder is not empty");
		for (const entry of readDirResult.files) {
			const entryPath = `${path}/${entry.name}`;
			if ((await this.stat({
				path: entryPath,
				directory
			})).type === "file") await this.deleteFile({
				path: entryPath,
				directory
			});
			else await this.rmdir({
				path: entryPath,
				directory,
				recursive
			});
		}
		await this.dbRequest("delete", [fullPath]);
	}
	/**
	* Return a list of files from the directory (not recursive)
	* @param options the options for the readdir operation
	* @return a promise that resolves with the readdir directory listing result
	*/
	async readdir(options) {
		const path = this.getPath(options.directory, options.path);
		const entry = await this.dbRequest("get", [path]);
		if (options.path !== "" && entry === void 0) throw Error("Folder does not exist.");
		const entries = await this.dbIndexRequest("by_folder", "getAllKeys", [IDBKeyRange.only(path)]);
		return { files: await Promise.all(entries.map(async (e) => {
			let subEntry = await this.dbRequest("get", [e]);
			if (subEntry === void 0) subEntry = await this.dbRequest("get", [e + "/"]);
			return {
				name: e.substring(path.length + 1),
				type: subEntry.type,
				size: subEntry.size,
				ctime: subEntry.ctime,
				mtime: subEntry.mtime,
				uri: subEntry.path
			};
		})) };
	}
	/**
	* Return full File URI for a path and directory
	* @param options the options for the stat operation
	* @return a promise that resolves with the file stat result
	*/
	async getUri(options) {
		const path = this.getPath(options.directory, options.path);
		let entry = await this.dbRequest("get", [path]);
		if (entry === void 0) entry = await this.dbRequest("get", [path + "/"]);
		return { uri: (entry === null || entry === void 0 ? void 0 : entry.path) || path };
	}
	/**
	* Return data about a file
	* @param options the options for the stat operation
	* @return a promise that resolves with the file stat result
	*/
	async stat(options) {
		const path = this.getPath(options.directory, options.path);
		let entry = await this.dbRequest("get", [path]);
		if (entry === void 0) entry = await this.dbRequest("get", [path + "/"]);
		if (entry === void 0) throw Error("Entry does not exist.");
		return {
			name: entry.path.substring(path.length + 1),
			type: entry.type,
			size: entry.size,
			ctime: entry.ctime,
			mtime: entry.mtime,
			uri: entry.path
		};
	}
	/**
	* Rename a file or directory
	* @param options the options for the rename operation
	* @return a promise that resolves with the rename result
	*/
	async rename(options) {
		await this._copy(options, true);
	}
	/**
	* Copy a file or directory
	* @param options the options for the copy operation
	* @return a promise that resolves with the copy result
	*/
	async copy(options) {
		return this._copy(options, false);
	}
	async requestPermissions() {
		return { publicStorage: "granted" };
	}
	async checkPermissions() {
		return { publicStorage: "granted" };
	}
	/**
	* Function that can perform a copy or a rename
	* @param options the options for the rename operation
	* @param doRename whether to perform a rename or copy operation
	* @return a promise that resolves with the result
	*/
	async _copy(options, doRename = false) {
		let { toDirectory } = options;
		const { to, from, directory: fromDirectory } = options;
		if (!to || !from) throw Error("Both to and from must be provided");
		if (!toDirectory) toDirectory = fromDirectory;
		const fromPath = this.getPath(fromDirectory, from);
		const toPath = this.getPath(toDirectory, to);
		if (fromPath === toPath) return { uri: toPath };
		if (isPathParent(fromPath, toPath)) throw Error("To path cannot contain the from path");
		let toObj;
		try {
			toObj = await this.stat({
				path: to,
				directory: toDirectory
			});
		} catch (e) {
			const toPathComponents = to.split("/");
			toPathComponents.pop();
			const toPath = toPathComponents.join("/");
			if (toPathComponents.length > 0) {
				if ((await this.stat({
					path: toPath,
					directory: toDirectory
				})).type !== "directory") throw new Error("Parent directory of the to path is a file");
			}
		}
		if (toObj && toObj.type === "directory") throw new Error("Cannot overwrite a directory with a file");
		const fromObj = await this.stat({
			path: from,
			directory: fromDirectory
		});
		const updateTime = async (path, ctime, mtime) => {
			const fullPath = this.getPath(toDirectory, path);
			const entry = await this.dbRequest("get", [fullPath]);
			entry.ctime = ctime;
			entry.mtime = mtime;
			await this.dbRequest("put", [entry]);
		};
		const ctime = fromObj.ctime ? fromObj.ctime : Date.now();
		switch (fromObj.type) {
			case "file": {
				const file = await this.readFile({
					path: from,
					directory: fromDirectory
				});
				if (doRename) await this.deleteFile({
					path: from,
					directory: fromDirectory
				});
				let encoding;
				if (!(file.data instanceof Blob) && !this.isBase64String(file.data)) encoding = Encoding.UTF8;
				const writeResult = await this.writeFile({
					path: to,
					directory: toDirectory,
					data: file.data,
					encoding
				});
				if (doRename) await updateTime(to, ctime, fromObj.mtime);
				return writeResult;
			}
			case "directory": {
				if (toObj) throw Error("Cannot move a directory over an existing object");
				try {
					await this.mkdir({
						path: to,
						directory: toDirectory,
						recursive: false
					});
					if (doRename) await updateTime(to, ctime, fromObj.mtime);
				} catch (e) {}
				const contents = (await this.readdir({
					path: from,
					directory: fromDirectory
				})).files;
				for (const filename of contents) await this._copy({
					from: `${from}/${filename.name}`,
					to: `${to}/${filename.name}`,
					directory: fromDirectory,
					toDirectory
				}, doRename);
				if (doRename) await this.rmdir({
					path: from,
					directory: fromDirectory
				});
			}
		}
		return { uri: toPath };
	}
	isBase64String(str) {
		try {
			return btoa(atob(str)) == str;
		} catch (err) {
			return false;
		}
	}
};
FilesystemWeb._debug = true;
// node_modules/@capacitor/haptics/dist/esm/web.js
var web_exports$3 = /* @__PURE__ */ __exportAll({ HapticsWeb: () => HapticsWeb });
var HapticsWeb = class extends WebPlugin {
	constructor() {
		super(...arguments);
		this.selectionStarted = false;
	}
	async impact(options) {
		const pattern = this.patternForImpact(options === null || options === void 0 ? void 0 : options.style);
		this.vibrateWithPattern(pattern);
	}
	async notification(options) {
		const pattern = this.patternForNotification(options === null || options === void 0 ? void 0 : options.type);
		this.vibrateWithPattern(pattern);
	}
	async vibrate(options) {
		const duration = (options === null || options === void 0 ? void 0 : options.duration) || 300;
		this.vibrateWithPattern([duration]);
	}
	async selectionStart() {
		this.selectionStarted = true;
	}
	async selectionChanged() {
		if (this.selectionStarted) this.vibrateWithPattern([70]);
	}
	async selectionEnd() {
		this.selectionStarted = false;
	}
	patternForImpact(style = ImpactStyle.Heavy) {
		if (style === ImpactStyle.Medium) return [43];
		else if (style === ImpactStyle.Light) return [20];
		return [61];
	}
	patternForNotification(type = NotificationType.Success) {
		if (type === NotificationType.Warning) return [
			30,
			40,
			30,
			50,
			60
		];
		else if (type === NotificationType.Error) return [
			27,
			45,
			50
		];
		return [
			35,
			65,
			21
		];
	}
	vibrateWithPattern(pattern) {
		if (navigator.vibrate) navigator.vibrate(pattern);
		else throw this.unavailable("Browser does not support the vibrate API");
	}
};
// node_modules/@capacitor/local-notifications/dist/esm/web.js
var web_exports$2 = /* @__PURE__ */ __exportAll({ LocalNotificationsWeb: () => LocalNotificationsWeb });
var LocalNotificationsWeb = class extends WebPlugin {
	constructor() {
		super(...arguments);
		this.pending = [];
		this.deliveredNotifications = [];
		this.hasNotificationSupport = () => {
			if (!("Notification" in window) || !Notification.requestPermission) return false;
			if (Notification.permission !== "granted") try {
				new Notification("");
			} catch (e) {
				if (e instanceof Error && e.name === "TypeError") return false;
			}
			return true;
		};
	}
	async getDeliveredNotifications() {
		const deliveredSchemas = [];
		for (const notification of this.deliveredNotifications) {
			const deliveredSchema = {
				title: notification.title,
				id: parseInt(notification.tag),
				body: notification.body
			};
			deliveredSchemas.push(deliveredSchema);
		}
		return { notifications: deliveredSchemas };
	}
	async removeDeliveredNotifications(delivered) {
		for (const toRemove of delivered.notifications) {
			const found = this.deliveredNotifications.find((n) => n.tag === String(toRemove.id));
			found === null || found === void 0 || found.close();
			this.deliveredNotifications = this.deliveredNotifications.filter(() => !found);
		}
	}
	async removeDeliveredNotificationsById(options) {
		for (const id of options.ids) {
			const found = this.deliveredNotifications.find((n) => n.tag === String(id));
			found === null || found === void 0 || found.close();
			this.deliveredNotifications = this.deliveredNotifications.filter((n) => n !== found);
		}
	}
	async removeAllDeliveredNotifications() {
		for (const notification of this.deliveredNotifications) notification.close();
		this.deliveredNotifications = [];
	}
	async getByIds(options) {
		const ids = options.ids.map((id) => String(id));
		const scheduled = this.pending.filter((n) => ids.includes(String(n.id)));
		const delivered = this.deliveredNotifications.filter((n) => ids.includes(n.tag)).map((n) => this.deliveredToSchema(n));
		return { notifications: [...scheduled, ...delivered] };
	}
	async getAll(options) {
		const scheduled = [...this.pending];
		const delivered = this.deliveredNotifications.map((n) => this.deliveredToSchema(n));
		if ((options === null || options === void 0 ? void 0 : options.state) === "SCHEDULED") return { notifications: scheduled };
		if ((options === null || options === void 0 ? void 0 : options.state) === "TRIGGERED") return { notifications: delivered };
		return { notifications: [...scheduled, ...delivered] };
	}
	deliveredToSchema(notification) {
		return {
			title: notification.title,
			id: parseInt(notification.tag),
			body: notification.body
		};
	}
	async createChannel() {
		throw this.unimplemented("Not implemented on web.");
	}
	async deleteChannel() {
		throw this.unimplemented("Not implemented on web.");
	}
	async listChannels() {
		throw this.unimplemented("Not implemented on web.");
	}
	async schedule(options) {
		if (!this.hasNotificationSupport()) throw this.unavailable("Notifications not supported in this browser.");
		for (const notification of options.notifications) this.sendNotification(notification);
		return { notifications: options.notifications.map((notification) => ({ id: notification.id })) };
	}
	async update(options) {
		if (!this.hasNotificationSupport()) throw this.unavailable("Notifications not supported in this browser.");
		const updated = [];
		for (const notification of options.notifications) {
			const index = this.pending.findIndex((n) => n.id === notification.id);
			if (index === -1) continue;
			this.pending.splice(index, 1);
			this.sendNotification(notification);
			updated.push(notification);
		}
		return { notifications: updated.map((notification) => ({ id: notification.id })) };
	}
	async getPending() {
		return { notifications: this.pending };
	}
	async cancelAll() {
		this.pending = [];
	}
	async registerActionTypes() {
		throw this.unimplemented("Not implemented on web.");
	}
	async cancel(pending) {
		this.pending = this.pending.filter((notification) => !pending.notifications.find((n) => n.id === notification.id));
	}
	async areEnabled() {
		const { display } = await this.checkPermissions();
		return { value: display === "granted" };
	}
	async changeExactNotificationSetting() {
		throw this.unimplemented("Not implemented on web.");
	}
	async checkExactNotificationSetting() {
		throw this.unimplemented("Not implemented on web.");
	}
	async requestPermissions() {
		if (!this.hasNotificationSupport()) throw this.unavailable("Notifications not supported in this browser.");
		return { display: this.transformNotificationPermission(await Notification.requestPermission()) };
	}
	async checkPermissions() {
		if (!this.hasNotificationSupport()) throw this.unavailable("Notifications not supported in this browser.");
		return { display: this.transformNotificationPermission(Notification.permission) };
	}
	transformNotificationPermission(permission) {
		switch (permission) {
			case "granted": return "granted";
			case "denied": return "denied";
			default: return "prompt";
		}
	}
	sendPending() {
		var _a;
		const toRemove = [];
		const now = (/* @__PURE__ */ new Date()).getTime();
		for (const notification of this.pending) if (((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) && notification.schedule.at.getTime() <= now) {
			this.buildNotification(notification);
			toRemove.push(notification);
		}
		this.pending = this.pending.filter((notification) => !toRemove.find((n) => n === notification));
	}
	sendNotification(notification) {
		var _a;
		if ((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) {
			const diff = notification.schedule.at.getTime() - (/* @__PURE__ */ new Date()).getTime();
			this.pending.push(notification);
			setTimeout(() => {
				this.sendPending();
			}, diff);
			return;
		}
		this.buildNotification(notification);
	}
	buildNotification(notification) {
		const localNotification = new Notification(notification.title, {
			body: notification.body,
			tag: String(notification.id)
		});
		localNotification.addEventListener("click", this.onClick.bind(this, notification), false);
		localNotification.addEventListener("show", this.onShow.bind(this, notification), false);
		localNotification.addEventListener("close", () => {
			this.deliveredNotifications = this.deliveredNotifications.filter(() => !this);
		}, false);
		this.deliveredNotifications.push(localNotification);
		return localNotification;
	}
	onClick(notification) {
		const data = {
			actionId: "tap",
			notification
		};
		this.notifyListeners("localNotificationActionPerformed", data);
	}
	onShow(notification) {
		this.notifyListeners("localNotificationReceived", notification);
	}
};
// node_modules/@capacitor/preferences/dist/esm/web.js
var web_exports$1 = /* @__PURE__ */ __exportAll({ PreferencesWeb: () => PreferencesWeb });
var PreferencesWeb = class extends WebPlugin {
	constructor() {
		super(...arguments);
		this.group = "CapacitorStorage";
	}
	async configure({ group }) {
		if (typeof group === "string") this.group = group;
	}
	async get(options) {
		return { value: this.impl.getItem(this.applyPrefix(options.key)) };
	}
	async set(options) {
		this.impl.setItem(this.applyPrefix(options.key), options.value);
	}
	async remove(options) {
		this.impl.removeItem(this.applyPrefix(options.key));
	}
	async keys() {
		return { keys: this.rawKeys().map((k) => k.substring(this.prefix.length)) };
	}
	async clear() {
		for (const key of this.rawKeys()) this.impl.removeItem(key);
	}
	async migrate() {
		var _a;
		const migrated = [];
		const existing = [];
		const oldprefix = "_cap_";
		const keys = Object.keys(this.impl).filter((k) => k.indexOf(oldprefix) === 0);
		for (const oldkey of keys) {
			const key = oldkey.substring(5);
			const value = (_a = this.impl.getItem(oldkey)) !== null && _a !== void 0 ? _a : "";
			const { value: currentValue } = await this.get({ key });
			if (typeof currentValue === "string") existing.push(key);
			else {
				await this.set({
					key,
					value
				});
				migrated.push(key);
			}
		}
		return {
			migrated,
			existing
		};
	}
	async removeOld() {
		const oldprefix = "_cap_";
		const keys = Object.keys(this.impl).filter((k) => k.indexOf(oldprefix) === 0);
		for (const oldkey of keys) this.impl.removeItem(oldkey);
	}
	get impl() {
		return window.localStorage;
	}
	get prefix() {
		return this.group === "NativeStorage" ? "" : `${this.group}.`;
	}
	rawKeys() {
		return Object.keys(this.impl).filter((k) => k.indexOf(this.prefix) === 0);
	}
	applyPrefix(key) {
		return this.prefix + key;
	}
};
// node_modules/@capacitor/share/dist/esm/web.js
var web_exports = /* @__PURE__ */ __exportAll({ ShareWeb: () => ShareWeb });
var ShareWeb = class extends WebPlugin {
	async canShare() {
		if (typeof navigator === "undefined" || !navigator.share) return { value: false };
		else return { value: true };
	}
	async share(options) {
		if (typeof navigator === "undefined" || !navigator.share) throw this.unavailable("Share API not available in this browser");
		await navigator.share({
			title: options.title,
			text: options.text,
			url: options.url
		});
		return {};
	}
};
// node_modules/@capacitor/app-launcher/dist/esm/index.js
var AppLauncher = registerPlugin("AppLauncher", { web: () => __vitePreload(() => Promise.resolve().then(() => web_exports$6).then((m) => new m.AppLauncherWeb()), void 0) });
export { Capacitor as _, LocalNotifications as a, registerPlugin as b, NotificationType as c, Encoding as d, Share as f, Style as g, StatusBar as h, App as i, Filesystem as l, __vitePreload as m, Clipboard as n, Haptics as o, Preferences as p, Keyboard as r, ImpactStyle as s, AppLauncher as t, Directory as u, CapacitorException as v, WebPlugin as y };
