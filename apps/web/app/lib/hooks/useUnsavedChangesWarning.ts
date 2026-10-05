"use client";

import { useEffect } from "react";

const MESSAGE = "You have unsaved changes. Leave without saving?";

/**
 * While `isDirty` is true, asks before the user leaves the page and loses their edits:
 *
 * - Clicking a link to another page on this site (tabs, the sidebar, the header) shows a
 *   confirm prompt; Cancel stops the navigation. The check runs in the capture phase on
 *   `document`, i.e. before Next's `<Link>` handles the click, so it can stop it.
 * - Reloading or closing the browser tab shows the browser's own "Leave site?" prompt
 *   (its wording can't be customised).
 *
 * Links that open elsewhere are left alone: new tabs (target="_blank", Ctrl/Cmd/Shift/
 * middle click), other sites, and links to the page that's already open.
 *
 * Not covered: the browser's Back/Forward buttons, which the Next app router gives no way
 * to cancel.
 */
export function useUnsavedChangesWarning(isDirty: boolean): void {
	useEffect(() => {
		if (!isDirty) {
			return;
		}

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			// Older browsers only show the prompt when returnValue is set
			event.returnValue = "";
		};

		const handleClick = (event: MouseEvent) => {
			// Only a plain left click navigates in this tab
			if (
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}

			const anchor = (event.target as Element | null)?.closest?.("a[href]");
			if (!(anchor instanceof HTMLAnchorElement)) {
				return;
			}
			if (anchor.target && anchor.target !== "_self") {
				return;
			}

			const destination = new URL(anchor.href, window.location.href);
			const here = new URL(window.location.href);
			if (destination.origin !== here.origin) {
				return;
			}
			// Same page (or just a #section on it): nothing would be lost
			if (
				destination.pathname === here.pathname &&
				destination.search === here.search
			) {
				return;
			}

			if (!window.confirm(MESSAGE)) {
				event.preventDefault();
				event.stopPropagation();
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		document.addEventListener("click", handleClick, true);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			document.removeEventListener("click", handleClick, true);
		};
	}, [isDirty]);
}
