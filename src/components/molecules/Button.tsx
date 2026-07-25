import React from "react";
import Icon from "../atoms/Icon";
import Text from "../atoms/Text";
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
			// w-full (não uma largura fixa): todo lugar que usa esse tamanho
			// hoje (Login, Cadastro, Sucesso, Excluir) quer ocupar a largura
			// do próprio contêiner, não um valor fixo em pixels — que estourava
			// em telas estreitas. Onde o botão deve ter largura pelo conteúdo,
			// já existe a variante "fit" (cabeçalho, "Confirmar" do modal).
			sm: "h-12 w-full py-4 px-5",
			fit: "h-11 w-fit py-2.5 px-5",
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
			fit: "text-sm",
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
			fit: "w-4 h-4",
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
			// Anuncia o estado "ocupado" para leitores de tela enquanto processa,
			// sem precisar mudar o texto do botão.
			aria-busy={handling ? true : undefined}
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
					// Ícone/spinner é decorativo: aria-hidden evita que ele entre no
					// nome acessível do botão. O loading é comunicado pelo aria-busy.
					aria-hidden
					className={buttonIconVariants({variant, size, handling})}
				/>
			)}
		</button>
	);
}
