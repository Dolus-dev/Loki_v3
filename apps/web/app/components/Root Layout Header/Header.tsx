"use client";

export default function RootLayoutHeader() {
	return (
		<header className="bg-brand-700 z-10 w-full sticky gap-2 items-center justify-between top-0 dark:bg-brand-900 py-2 shadow-md flex flex-row ">
			<div className=" ml-2 ">
				<h1 className=" ">Header</h1>
			</div>
			<div className=" mr-2 ">
				<p>Additional Content</p>
			</div>
		</header>
	);
}
