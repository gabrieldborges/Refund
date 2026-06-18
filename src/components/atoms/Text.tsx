import React from "react";
import {tv, type VariantProps} from "tailwind-variants";

export const textVariants = tv({
	base: "font-sans ",
	variants: {
		variant: {
			"heading-large": "text-2xl leading-[240%] font-bold",
			"heading-medium": "text-xl leading-[200%] font-bold",
			"button": "text-sm leading-[180%] font-bold",
			"paragraph-large": "text-base leading-[150%] font-medium",
			"paragraph-medium": "text-sm leading-[180%] font-regular",
			"paragraph-small": "text-xs leading-[160%] font-regular",
			"label-medium": "text-sm leading-[240%] font-semibold",
			"label-small": "text-[0.625rem] leading-[140%] font-regular",
		},
	},
	defaultVariants: {
		variant: "paragraph-medium",
	},
});

interface TextProps extends VariantProps<typeof textVariants> {
	as?: keyof React.JSX.IntrinsicElements;
	className?: string;
	children?: React.ReactNode;
}

export default function Text({
	as = "span",
	variant,
	className,
	children,
	...props
}: TextProps) {
	return React.createElement(
		as,
		{
			className: textVariants({variant, className}),
			...props,
		},
		children
	);
}
