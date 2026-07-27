import React from "react";
import Icon from "../atoms/Icon";
import {tv, type VariantProps} from "tailwind-variants";
import SpinnerIcon from "../../assets/icons/Spinner.svg?react";

export const buttonIconVariants = tv({
	base: "inline-flex items-center justify-center cursor-pointer transition",
	variants: {
		variant: {
			primary: "bg-accent hover:bg-accent-strong",
		},
		size: {
			sm: "w-12 h-12 p-2 rounded",
		},
		disabled: {
			true: "opacity-50 pointer-events-none",
		},
		handling: {
			true: "pointer-events-none",
		},
	},
	defaultVariants: {
		variant: "primary",
		size: "sm",
		disabled: false,
		handling: false,
	},
});

export const buttonIconIconVariants = tv({
	variants: {
		variant: {
			primary: "text-on-accent",
		},
		size: {
			sm: "w-12 h-12",
		},
	},
	defaultVariants: {
		variant: "primary",
		size: "sm",
	},
});

interface ButtonIconProps
	extends VariantProps<typeof buttonIconVariants>,
		Omit<React.ComponentProps<"button">, "size" | "disabled"> {
	icon: React.ComponentProps<typeof Icon>["svg"];
	handling?: boolean;
}

export default function ButtonIcon({
	variant,
	size,
	disabled,
	className,
	icon,
	handling,
	...props
}: ButtonIconProps) {
	return (
		<button
			className={buttonIconVariants({
				variant,
				size,
				disabled,
				className,
				handling,
			})}
			{...props}
		>
			<Icon
				svg={handling ? SpinnerIcon : icon}
				animate={handling}
				className={buttonIconIconVariants({variant, size})}
			/>
		</button>
	);
}
