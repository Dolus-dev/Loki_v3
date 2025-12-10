import { Theme } from "./enums";

export default function isValidTheme(value: unknown): value is Theme {
	return value === Theme.Light || value === Theme.Dark;
}
