import { h as App, v as CapacitorException, y as WebPlugin } from "./vendor-capacitor-B8Rg19TU.js";
import { S as isBiometryErrorType, y as BiometryError } from "./index-DZEPpQ7N.js";
// node_modules/@aparajita/capacitor-biometric-auth/dist/esm/base.js
var BiometricAuthBase = class extends WebPlugin {
	async authenticate(options) {
		try {
			await this.internalAuthenticate(options);
		} catch (error) {
			throw error instanceof CapacitorException && isBiometryErrorType(error.code) ? new BiometryError(error.message, error.code) : error;
		}
	}
	async addResumeListener(listener) {
		return App.addListener("appStateChange", ({ isActive }) => {
			if (isActive) (async () => {
				try {
					listener(await this.checkBiometry());
				} catch (error) {
					console.error(error);
				}
			})();
		});
	}
};
export { BiometricAuthBase as t };
