import React from "react";
import Icon from "./Icon";
import Text from "./Text";
import {tv, type VariantProps} from "tailwind-variants";
import cx from "classnames";
import SpinnerIcon from "../../assets/icons/Spinner.svg?react";

export const buttonVariants = tv({
	base: "flex items-center justify-center cursor-pointer transition rounded group gap-1",
	variants: {
		variant: {
			primary: "bg-green-100 hover:bg-green-200",
		
		},
		size: {
			sm: "h-12 w-88 py-4 px-5",
			
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

export const buttonTextVariants = tv({
	variants: {
		variant: {
			primary: "text-white",
			
		},
		size: {
			sm: "text-sm",
			
		},
	},
	defaultVariants: {
		variant: "primary",
		size: "sm",
	},
});

export const buttonIconVariants = tv({
	variants: {
		variant: {
			primary: "fill-white",
			
		},
		size: {
			sm: "w-4 h-4",
		},
		handling: {
			true: "w-4 h-4",
		},
	},
	defaultVariants: {
		variant: "primary",
		size: "sm",
	},
});

interface ButtonProps
	extends Omit<React.ComponentProps<"button">, "size" | "disabled">,
		VariantProps<typeof buttonVariants> {
	icon?: React.ComponentProps<typeof Icon>["svg"];
	handling?: boolean;
}

export default function Button({
	variant,
	size,
	disabled,
	className,
	children,
	handling,
	icon,
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			className={buttonVariants({
				variant,
				size,
				disabled,
				handling,
				className: cx(
					{
						"pr-1": icon,
					},
					className
				),
			})}
			disabled={disabled as boolean}
			{...props}
		>
			<Text
				variant="paragraph-medium"
				className={buttonTextVariants({variant, size})}
			>
				{children}
			</Text>
			{(icon || handling) && (
				<Icon
					svg={handling ? SpinnerIcon : icon!}
					animate={handling}
					className={buttonIconVariants({variant, size, handling})}
				/>
			)}
		</button>
	);
}
