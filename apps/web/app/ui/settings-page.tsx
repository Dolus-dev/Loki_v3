"use client";

import { ReactNode } from "react";
import { FaTriangleExclamation } from "react-icons/fa6";
import { ApiError } from "../lib/api";

interface SettingsPageProps {
	title: string;
	/** Intro text shown at the top of the card. */
	description: ReactNode;
	isLoading: boolean;
	/** The settings' load error, if any; replaces the form with an explanation. */
	loadError: unknown;
	/** The form. Only rendered once the settings have loaded. */
	children: ReactNode;
	/** Usually a `SaveBar`. */
	footer: ReactNode;
}

function loadErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 403) return "You don't have access to these settings.";
		if (error.status === 404) return "This server isn't set up with Loki yet.";
	}
	return "Couldn't load these settings. Try again in a moment.";
}

/** The shared layout of a dashboard settings page: title, alpha notice, form card, footer. */
export default function SettingsPage(props: SettingsPageProps) {
	const { title, description, isLoading, loadError, children, footer } = props;

	return (
		<div className=" max-w-[85vw] ml-75 pb-24">
			{/* pb-24 keeps the save bar clear of the root layout's fixed 80px (h-20) footer */}
			<section className="mt-5 flex flex-col gap-4">
				<h1 className="text-4xl pl-15 font-semibold leading-tight text-neutral-100">
					{title}
				</h1>

				<div className="bg-neutral-700/60 p-4 mx-10 rounded-lg flex flex-col gap-6">
					<section className="bg-alert-700 p-4 w-fit place-self-center items-center rounded-lg flex -mt-2 flex-row">
						<FaTriangleExclamation className="size-6 shrink-0 mr-4" />
						<span>
							Beware! Saved changes may be lost in future updates during the
							alpha period. We apologize for any inconvenience caused.
						</span>
					</section>

					<div className="ml-4 flex flex-col gap-2 text-neutral-200">
						{description}
					</div>

					{isLoading ? (
						<p className="ml-4 text-neutral-400">Loading settings...</p>
					) : loadError ? (
						<p className="ml-4 text-danger-400">
							{loadErrorMessage(loadError)}
						</p>
					) : (
						children
					)}
				</div>

				{!isLoading && !loadError && footer}
			</section>
		</div>
	);
}

/** A validation message under an input; renders nothing without a message. */
export function FieldError({ message }: { message?: string }) {
	if (!message) {
		return null;
	}
	return <p className="text-sm text-danger-400">{message}</p>;
}
