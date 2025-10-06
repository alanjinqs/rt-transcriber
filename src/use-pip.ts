import { useState } from "react";

// Custom hook for Picture-in-Picture functionality
export const usePiP = ({ width = 600, height = 400 }) => {
	const [pipWindow, setPiPWindow] = useState<Window | null>(null);
	const isSupported = "documentPictureInPicture" in window;

	const openPiP = async () => {
		try {
			// @ts-expect-error - documentPictureInPicture is not in TypeScript types yet
			const pw = await window.documentPictureInPicture?.requestWindow({
				width: width,
				height: height,
				disallowReturnToOpener: false,
				preferInitialWindowPlacement: false,
			});

			if (!pw) return;

			setPiPWindow(pw);

			// Handle when user closes the PiP window
			pw.addEventListener("pagehide", () => {
				setPiPWindow(null);
			});

			// Copy parent page styles to PiP window
			Array.from(document.styleSheets).forEach((styleSheet) => {
				try {
					const cssRules = Array.from(styleSheet.cssRules)
						.map((rule) => rule.cssText)
						.join("");
					const style = document.createElement("style");

					style.textContent = cssRules;
					pw?.document.head.appendChild(style);
				} catch {
					// Handle cross-origin stylesheets
					const link = document.createElement("link");
					if (styleSheet.href == null) {
						return;
					}

					link.rel = "stylesheet";
					link.type = styleSheet.type;
					link.media = styleSheet.media.toString();
					link.href = styleSheet.href;
					pw.document.head.appendChild(link);
				}
			});
		} catch (error) {
			console.error("Failed to open PiP window:", error);
		}
	};

	const closePiP = () => {
		pipWindow?.close();
		setPiPWindow(null);
	};

	return { pipWindow, openPiP, closePiP, isSupported };
};
