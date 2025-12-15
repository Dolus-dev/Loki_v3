import Image from "next/image";
import Link from "next/link";

export default function Home() {
	return (
		<main className="flex flex-col items-center justify-center self-center max-w-full w-full  pb-16 gap-10">
			<section className=" w-full  p-6 flex flex-col items-center justify-center gap-6 ">
				<div className="grid grid-cols-2 w-full">
					<div className="w-full  flex flex-col mt-12 items-start   gap-2">
						<div className=" flex flex-row  ml-10 mb-5 justify-items-start gap-2  ">
							<Image
								src="/logo.png"
								alt="Logo"
								width={256}
								height={256}
								className="size-30   shrink-0"
							/>
							<span className="text-7xl font-extrabold  tracking-wider  mt-10 ">
								LOKI
							</span>
						</div>
						<span className="text-2xl font-semibold text-neutral-300 ml-15">
							Multi-purpose Discord Bot.
						</span>
						<span className="text-2xl font-semibold text-neutral-300 ml-15">
							Fully Customizable.
						</span>
						<span className="text-2xl font-semibold text-neutral-300 ml-15">
							Completely Free.
						</span>
						<div className="flex flex-row gap-6 mt-10 ml-15 justify-items-start">
							<Link
								href={""}
								className="bg-brand-800 px-4 pt-2 pb-1.5 text-neutral-100 rounded-3xl text-xl align-middle font-bold">
								Add to Discord
							</Link>
							<button className="px-4 pt-2 pb-1.5 rounded-3xl text-xl font-bold text-neutral-100 bg-neutral-800">
								Explore Features
							</button>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
